use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{Datelike, FixedOffset, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{mysql::MySqlPoolOptions, FromRow};
use std::{collections::HashMap, net::SocketAddr, sync::Arc, time::Duration};
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
};
use tracing::{error, info};

type DbPool = sqlx::MySqlPool;

#[derive(Clone)]
struct AppState {
    db: DbPool,
    audio_dir: String,
    branding_dir: String,
}

#[derive(Serialize, Deserialize, FromRow, Debug, Clone)]
struct ScheduleProfile {
    id: i32,
    code: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
    is_active: i8,
    item_count: i64,
}

#[derive(Serialize, Deserialize, FromRow, Debug)]
struct ScheduleItem {
    id: i32,
    profile_id: i32,
    day_of_week: String,
    bell_time: String,
    event_name: String,
    audio_id: i32,
    volume: Option<u8>,
    is_enabled: i8,
    audio_title: Option<String>,
    audio_file: Option<String>,
}

#[derive(Serialize, Deserialize, FromRow, Debug)]
struct AudioItem {
    id: i32,
    title: String,
    filename: String,
    file_path: String,
    duration_seconds: Option<i32>,
    category: Option<String>,
}

#[derive(Serialize, Deserialize, FromRow, Debug)]
struct SoundboardButton {
    id: i32,
    label: String,
    audio_id: i32,
    button_color: Option<String>,
    sort_order: Option<i32>,
    audio_title: String,
    filename: String,
    category: Option<String>,
}

#[derive(Serialize, Deserialize, FromRow, Debug)]
struct BellLog {
    id: i64,
    schedule_item_id: Option<i32>,
    audio_id: i32,
    event_title: String,
    trigger_source: String,
    played_at: String,
    status: String,
    audio_title: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct NextBellInfo {
    id: i32,
    audio_id: i32,
    event_name: String,
    bell_time: String,
    audio_title: String,
    filename: String,
    remaining_seconds: i64,
}

#[derive(Serialize, Deserialize, Debug)]
struct TodayStats {
    total_today: usize,
    completed_today: usize,
    remaining_today: usize,
    progress_percent: u8,
}

#[derive(Serialize, Deserialize, Debug)]
struct AppSettings {
    school_name: String,
    school_logo: String,
    master_volume: u8,
    mute_mode: bool,
    remote_port: String,
    timezone_name: String,
    timezone_offset_hours: i32,
    time_format: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct StatusResponse {
    current_time: String,
    current_date: String,
    current_day: String,
    day_code: String,
    active_profile: Option<ScheduleProfile>,
    next_bell: Option<NextBellInfo>,
    stats: TodayStats,
    settings: AppSettings,
}

#[derive(Deserialize)]
struct ScheduleQuery {
    profile_id: Option<i32>,
}

#[derive(Deserialize)]
struct CreateScheduleRequest {
    profile_id: i32,
    day_of_week: String,
    bell_time: String,
    event_name: String,
    audio_id: i32,
    volume: Option<u8>,
}

#[derive(Deserialize)]
struct UpdateSettingsRequest {
    master_volume: Option<u8>,
    mute_mode: Option<bool>,
    school_name: Option<String>,
    timezone_offset_hours: Option<i32>,
    time_format: Option<String>,
    timezone_name: Option<String>,
}

#[derive(Deserialize)]
struct CreateButtonRequest {
    label: String,
    audio_id: i32,
    button_color: Option<String>,
}

#[derive(Serialize)]
struct TriggerResponse {
    message: String,
    audio_id: i32,
    title: String,
    audio_url: String,
    volume: u8,
    muted: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::from_path("/home/muse/.openclaw/workspace/bel-sekolah/backend/.env").ok();
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "mysql://bel_user:***@127.0.0.1:3306/bel_sekolah".to_string());

    info!("Menghubungkan ke database MySQL...");
    let pool = MySqlPoolOptions::new()
        .max_connections(8)
        .connect(&database_url)
        .await?;

    let audio_dir = std::env::var("AUDIO_ASSETS_DIR")
        .unwrap_or_else(|_| "/home/muse/.openclaw/workspace/bel-sekolah/audio-assets".to_string());
    tokio::fs::create_dir_all(&audio_dir).await.ok();

    let branding_dir = std::env::var("BRANDING_DIR")
        .unwrap_or_else(|_| "/home/muse/.openclaw/workspace/bel-sekolah/branding".to_string());
    tokio::fs::create_dir_all(&branding_dir).await.ok();

    let state = Arc::new(AppState {
        db: pool.clone(),
        audio_dir: audio_dir.clone(),
        branding_dir: branding_dir.clone(),
    });

    let scheduler_pool = pool.clone();
    tokio::spawn(async move {
        run_scheduler(scheduler_pool).await;
    });

    let frontend_dist = std::env::var("FRONTEND_DIST_DIR")
        .unwrap_or_else(|_| "/home/muse/.openclaw/workspace/bel-sekolah/frontend/dist".to_string());
    let index_html = format!("{}/index.html", frontend_dist);

    let app = Router::new()
        .route("/api/status", get(get_system_status))
        .route("/api/profiles", get(get_profiles))
        .route("/api/profiles/:id/activate", post(activate_profile))
        .route("/api/schedules", get(get_schedules).post(create_schedule))
        .route("/api/schedules/:id/toggle", post(toggle_schedule))
        .route("/api/schedules/:id", delete(delete_schedule))
        .route("/api/audios", get(get_audios))
        .route("/api/audios/upload", post(upload_audio))
        .route("/api/audios/:id", delete(delete_audio))
        .route("/api/soundboard", get(get_soundboard).post(create_soundboard_button))
        .route("/api/soundboard/:id", delete(delete_soundboard_button))
        .route("/api/logs", get(get_logs))
        .route("/api/settings", post(update_settings))
        .route("/api/settings/logo", post(upload_school_logo).delete(reset_school_logo))
        .route("/api/trigger-bell/:audio_id", post(trigger_manual_bell))
        .nest_service("/audio", ServeDir::new(&audio_dir))
        .nest_service("/branding", ServeDir::new(&branding_dir))
        .fallback_service(ServeDir::new(&frontend_dist).not_found_service(ServeFile::new(&index_html)))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    let port: u16 = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Bel Sekolah Backend berjalan di http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn get_tz_offset(pool: &DbPool) -> FixedOffset {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'timezone_offset_hours' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    let offset_hours = row.and_then(|r| r.0.parse::<i32>().ok()).unwrap_or(7);
    FixedOffset::east_opt(offset_hours * 3600).unwrap_or_else(|| FixedOffset::east_opt(7 * 3600).unwrap())
}

fn day_code_from_time<Tz: chrono::TimeZone>(now: &chrono::DateTime<Tz>) -> &'static str {
    match now.weekday() {
        chrono::Weekday::Mon => "SENIN",
        chrono::Weekday::Tue => "SELASA",
        chrono::Weekday::Wed => "RABU",
        chrono::Weekday::Thu => "KAMIS",
        chrono::Weekday::Fri => "JUMAT",
        chrono::Weekday::Sat => "SABTU",
        chrono::Weekday::Sun => "MINGGU",
    }
}

fn day_label_from_time<Tz: chrono::TimeZone>(now: &chrono::DateTime<Tz>) -> &'static str {
    match now.weekday() {
        chrono::Weekday::Mon => "Senin",
        chrono::Weekday::Tue => "Selasa",
        chrono::Weekday::Wed => "Rabu",
        chrono::Weekday::Thu => "Kamis",
        chrono::Weekday::Fri => "Jumat",
        chrono::Weekday::Sat => "Sabtu",
        chrono::Weekday::Sun => "Minggu",
    }
}

async fn run_scheduler(pool: DbPool) {
    info!("Scheduler Engine aktif (pemeriksaan tiap 500ms)...");
    let mut last_checked_minute = String::new();

    loop {
        let tz = get_tz_offset(&pool).await;
        let now = Utc::now().with_timezone(&tz);
        let current_time_str = now.format("%H:%M:00").to_string();
        let current_minute_str = now.format("%H:%M").to_string();

        if current_minute_str != last_checked_minute {
            last_checked_minute = current_minute_str;
            let day_name = day_code_from_time(&now);

            let mute_val: Option<(String,)> = sqlx::query_as(
                "SELECT setting_value FROM system_settings WHERE setting_key = 'mute_mode' LIMIT 1",
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

            let is_muted = mute_val.map(|v| v.0 == "true").unwrap_or(false);

            let query = r#"
                SELECT si.id, si.event_name, TIME_FORMAT(si.bell_time, '%H:%i') as bell_time, si.audio_id, al.title as audio_title
                FROM schedule_items si
                JOIN schedule_profiles sp ON si.profile_id = sp.id
                JOIN audio_library al ON si.audio_id = al.id
                WHERE sp.is_active = 1
                  AND si.is_enabled = 1
                  AND (si.day_of_week = ? OR si.day_of_week = 'SEMUA_HARI')
                  AND TIME_FORMAT(si.bell_time, '%H:%i:00') = ?
            "#;

            let matches = sqlx::query_as::<_, (i32, String, String, i32, String)>(query)
                .bind(day_name)
                .bind(&current_time_str)
                .fetch_all(&pool)
                .await
                .unwrap_or_default();

            for (id, event_name, bell_time, audio_id, audio_title) in matches {
                let status = if is_muted { "STOPPED_MANUALLY" } else { "PLAYED" };
                info!(
                    "Jadwal Bel: [{}] jam {} - Audio: {} (status: {})",
                    event_name, bell_time, audio_title, status
                );

                let log_insert = r#"
                    INSERT INTO bell_logs (schedule_item_id, audio_id, event_title, trigger_source, played_at, status)
                    VALUES (?, ?, ?, 'SCHEDULER_AUTO', NOW(), ?)
                "#;
                if let Err(e) = sqlx::query(log_insert)
                    .bind(id)
                    .bind(audio_id)
                    .bind(&event_name)
                    .bind(status)
                    .execute(&pool)
                    .await
                {
                    error!("Gagal menulis bell_logs: {}", e);
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }
}

async fn load_settings(pool: &DbPool) -> AppSettings {
    let rows = sqlx::query_as::<_, (String, String)>(
        "SELECT setting_key, setting_value FROM system_settings",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let map: HashMap<String, String> = rows.into_iter().collect();
    AppSettings {
        school_name: map
            .get("school_name")
            .cloned()
            .unwrap_or_else(|| "Mutiara Hati".to_string()),
        school_logo: map
            .get("school_logo")
            .cloned()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "/logo-sekolah.png".to_string()),
        master_volume: map
            .get("master_volume")
            .and_then(|v| v.parse::<u8>().ok())
            .unwrap_or(90),
        mute_mode: map
            .get("mute_mode")
            .map(|v| v == "true")
            .unwrap_or(false),
        remote_port: map
            .get("remote_port")
            .cloned()
            .unwrap_or_else(|| "8080".to_string()),
        timezone_name: map
            .get("timezone_name")
            .cloned()
            .unwrap_or_else(|| "Asia/Jakarta (WIB)".to_string()),
        timezone_offset_hours: map
            .get("timezone_offset_hours")
            .and_then(|v| v.parse::<i32>().ok())
            .unwrap_or(7),
        time_format: map
            .get("time_format")
            .cloned()
            .unwrap_or_else(|| "24H".to_string()),
    }
}

async fn get_system_status(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let settings = load_settings(&state.db).await;
    let tz = FixedOffset::east_opt(settings.timezone_offset_hours * 3600)
        .unwrap_or_else(|| FixedOffset::east_opt(7 * 3600).unwrap());
    let now = Utc::now().with_timezone(&tz);

    let current_time = if settings.time_format == "12H" {
        now.format("%I:%M:%S %p").to_string()
    } else {
        now.format("%H:%M:%S").to_string()
    };
    let current_date = now.format("%d %b %Y").to_string();
    let current_day = day_label_from_time(&now).to_string();
    let day_code = day_code_from_time(&now).to_string();

    let active_profile = sqlx::query_as::<_, ScheduleProfile>(
        r#"
        SELECT sp.id, sp.code, sp.name, sp.description, sp.color, sp.is_active,
               COUNT(si.id) as item_count
        FROM schedule_profiles sp
        LEFT JOIN schedule_items si ON si.profile_id = sp.id
        WHERE sp.is_active = 1
        GROUP BY sp.id
        LIMIT 1
        "#,
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let today_items = sqlx::query_as::<_, (i32, i32, String, String, String, String, i8)>(
        r#"
        SELECT si.id, si.audio_id, TIME_FORMAT(si.bell_time, '%H:%i:%s') as bell_time, si.event_name,
               al.title as audio_title, al.filename, si.is_enabled
        FROM schedule_items si
        JOIN schedule_profiles sp ON si.profile_id = sp.id
        JOIN audio_library al ON si.audio_id = al.id
        WHERE sp.is_active = 1
          AND si.is_enabled = 1
          AND (si.day_of_week = ? OR si.day_of_week = 'SEMUA_HARI')
        ORDER BY si.bell_time ASC
        "#,
    )
    .bind(&day_code)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let now_naive = now.time();
    let mut completed_today = 0usize;
    let mut next_bell: Option<NextBellInfo> = None;

    for (id, audio_id, bell_time_full, event_name, audio_title, filename, _enabled) in &today_items {
        if let Ok(parsed) = NaiveTime::parse_from_str(bell_time_full, "%H:%M:%S") {
            let diff = (parsed - now_naive).num_seconds();
            if diff <= 0 {
                completed_today += 1;
            } else if next_bell.is_none() {
                next_bell = Some(NextBellInfo {
                    id: *id,
                    audio_id: *audio_id,
                    event_name: event_name.clone(),
                    bell_time: bell_time_full.chars().take(5).collect(),
                    audio_title: audio_title.clone(),
                    filename: filename.clone(),
                    remaining_seconds: diff,
                });
            }
        }
    }

    let total_today = today_items.len();
    let remaining_today = total_today.saturating_sub(completed_today);
    let progress_percent = if total_today > 0 {
        ((completed_today * 100) / total_today) as u8
    } else {
        0
    };

    Json(StatusResponse {
        current_time,
        current_date,
        current_day,
        day_code,
        active_profile,
        next_bell,
        stats: TodayStats {
            total_today,
            completed_today,
            remaining_today,
            progress_percent,
        },
        settings,
    })
}

async fn get_profiles(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let profiles = sqlx::query_as::<_, ScheduleProfile>(
        r#"
        SELECT sp.id, sp.code, sp.name, sp.description, sp.color, sp.is_active,
               COUNT(si.id) as item_count
        FROM schedule_profiles sp
        LEFT JOIN schedule_items si ON si.profile_id = sp.id
        GROUP BY sp.id
        ORDER BY sp.id ASC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(profiles)
}

async fn activate_profile(
    Path(profile_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let mut tx = match state.db.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Gagal memulai transaksi database" })),
            )
                .into_response()
        }
    };

    let _ = sqlx::query("UPDATE schedule_profiles SET is_active = 0")
        .execute(&mut *tx)
        .await;
    let update_res = sqlx::query("UPDATE schedule_profiles SET is_active = 1 WHERE id = ?")
        .bind(profile_id)
        .execute(&mut *tx)
        .await;

    match update_res {
        Ok(res) if res.rows_affected() > 0 => {
            let _ = tx.commit().await;
            (
                StatusCode::OK,
                Json(serde_json::json!({ "message": "Profil berhasil diaktifkan", "profile_id": profile_id })),
            )
                .into_response()
        }
        _ => {
            let _ = tx.rollback().await;
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Profil jadwal tidak ditemukan" })),
            )
                .into_response()
        }
    }
}

async fn get_schedules(
    Query(query): Query<ScheduleQuery>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let items = if let Some(pid) = query.profile_id {
        sqlx::query_as::<_, ScheduleItem>(
            r#"
            SELECT si.id, si.profile_id, si.day_of_week, TIME_FORMAT(si.bell_time, '%H:%i') as bell_time,
                   si.event_name, si.audio_id, si.volume, si.is_enabled,
                   al.title as audio_title, al.filename as audio_file
            FROM schedule_items si
            LEFT JOIN audio_library al ON si.audio_id = al.id
            WHERE si.profile_id = ?
            ORDER BY si.bell_time ASC
            "#,
        )
        .bind(pid)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, ScheduleItem>(
            r#"
            SELECT si.id, si.profile_id, si.day_of_week, TIME_FORMAT(si.bell_time, '%H:%i') as bell_time,
                   si.event_name, si.audio_id, si.volume, si.is_enabled,
                   al.title as audio_title, al.filename as audio_file
            FROM schedule_items si
            LEFT JOIN audio_library al ON si.audio_id = al.id
            ORDER BY si.bell_time ASC
            "#,
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
    };

    Json(items)
}

async fn create_schedule(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateScheduleRequest>,
) -> impl IntoResponse {
    let clean_name = payload.event_name.trim();
    if clean_name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Nama kegiatan bel tidak boleh kosong" })),
        )
            .into_response();
    }

    let time_str = if payload.bell_time.len() == 5 {
        format!("{}:00", payload.bell_time)
    } else {
        payload.bell_time.clone()
    };

    let vol = payload.volume.unwrap_or(100).min(100);
    let res = sqlx::query(
        r#"
        INSERT INTO schedule_items (profile_id, day_of_week, bell_time, event_name, audio_id, volume, is_enabled)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        "#,
    )
    .bind(payload.profile_id)
    .bind(&payload.day_of_week)
    .bind(&time_str)
    .bind(clean_name)
    .bind(payload.audio_id)
    .bind(vol)
    .execute(&state.db)
    .await;

    match res {
        Ok(done) => (
            StatusCode::CREATED,
            Json(serde_json::json!({ "id": done.last_insert_id(), "message": "Jadwal baru tersimpan" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": format!("Gagal menyimpan jadwal: {}", e) })),
        )
            .into_response(),
    }
}

async fn toggle_schedule(
    Path(item_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let res = sqlx::query(
        "UPDATE schedule_items SET is_enabled = IF(is_enabled = 1, 0, 1) WHERE id = ?",
    )
    .bind(item_id)
    .execute(&state.db)
    .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({ "message": "Status jadwal diperbarui", "id": item_id })),
        )
            .into_response(),
        _ => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Item jadwal tidak ditemukan" })),
        )
            .into_response(),
    }
}

async fn delete_schedule(
    Path(item_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let res = sqlx::query("DELETE FROM schedule_items WHERE id = ?")
        .bind(item_id)
        .execute(&state.db)
        .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({ "message": "Jadwal dihapus", "id": item_id })),
        )
            .into_response(),
        _ => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Item jadwal tidak ditemukan" })),
        )
            .into_response(),
    }
}

async fn get_audios(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let audios = sqlx::query_as::<_, AudioItem>(
        "SELECT id, title, filename, file_path, duration_seconds, category FROM audio_library ORDER BY id ASC",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(audios)
}

async fn upload_audio(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut title = String::new();
    let mut category = "CUSTOM".to_string();
    let mut saved_filename = String::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "title" {
            if let Ok(text) = field.text().await {
                title = text.trim().to_string();
            }
        } else if name == "category" {
            if let Ok(text) = field.text().await {
                let cat = text.trim().to_uppercase();
                if ["BELL", "ANNOUNCEMENT", "NATIONAL_ANTHEM", "PRAYER", "EMERGENCY", "CUSTOM"].contains(&cat.as_str()) {
                    category = cat;
                }
            }
        } else if name == "file" {
            let original_name = field.file_name().unwrap_or("audio.mp3").to_string();
            let ext = std::path::Path::new(&original_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("mp3")
                .to_lowercase();

            let rand_suffix = chrono::Utc::now().timestamp_subsec_millis();
            let safe_name = format!("custom_{}_{}.{}", chrono::Utc::now().timestamp(), rand_suffix, ext);
            let target_path = format!("{}/{}", state.audio_dir, safe_name);

            if let Ok(bytes) = field.bytes().await {
                if let Err(e) = tokio::fs::write(&target_path, &bytes).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": format!("Gagal menyimpan file audio: {}", e) })),
                    )
                        .into_response();
                }
                saved_filename = safe_name;
            }
        }
    }

    if saved_filename.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "File audio wajib dilampirkan (.mp3 / .wav)" })),
        )
            .into_response();
    }

    if title.is_empty() {
        title = saved_filename.clone();
    }

    let file_path = format!("{}/{}", state.audio_dir, saved_filename);
    let res = sqlx::query(
        r#"
        INSERT INTO audio_library (title, filename, file_path, category, is_system)
        VALUES (?, ?, ?, ?, 0)
        "#,
    )
    .bind(&title)
    .bind(&saved_filename)
    .bind(&file_path)
    .bind(&category)
    .execute(&state.db)
    .await;

    match res {
        Ok(done) => (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "message": "Suara baru berhasil diunggah",
                "id": done.last_insert_id(),
                "title": title,
                "filename": saved_filename
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Gagal mencatat ke pustaka audio: {}", e) })),
        )
            .into_response(),
    }
}

async fn delete_audio(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let item = sqlx::query_as::<_, AudioItem>(
        "SELECT id, title, filename, file_path, duration_seconds, category FROM audio_library WHERE id = ? LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let Some(audio) = item else {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Audio tidak ditemukan" })),
        )
            .into_response();
    };

    let _ = tokio::fs::remove_file(&audio.file_path).await;
    let _ = sqlx::query("DELETE FROM audio_library WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await;

    (
        StatusCode::OK,
        Json(serde_json::json!({ "message": "Audio berhasil dihapus", "id": id })),
    )
        .into_response()
}

async fn get_soundboard(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let buttons = sqlx::query_as::<_, SoundboardButton>(
        r#"
        SELECT sb.id, sb.label, sb.audio_id, sb.button_color, sb.sort_order,
               al.title as audio_title, al.filename, al.category
        FROM soundboard_buttons sb
        JOIN audio_library al ON sb.audio_id = al.id
        WHERE sb.is_active = 1
        ORDER BY sb.sort_order ASC, sb.id ASC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(buttons)
}

async fn create_soundboard_button(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateButtonRequest>,
) -> impl IntoResponse {
    let clean_label = payload.label.trim();
    if clean_label.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Label tombol tidak boleh kosong" })),
        )
            .into_response();
    }

    let color = payload.button_color.unwrap_or_else(|| "lime".to_string());
    let res = sqlx::query(
        r#"
        INSERT INTO soundboard_buttons (label, audio_id, button_color, sort_order, is_active)
        VALUES (?, ?, ?, 99, 1)
        "#,
    )
    .bind(clean_label)
    .bind(payload.audio_id)
    .bind(color)
    .execute(&state.db)
    .await;

    match res {
        Ok(done) => (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "id": done.last_insert_id(),
                "message": "Tombol soundboard baru berhasil ditambahkan"
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": format!("Gagal membuat tombol soundboard: {}", e) })),
        )
            .into_response(),
    }
}

async fn delete_soundboard_button(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let res = sqlx::query("DELETE FROM soundboard_buttons WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({ "message": "Tombol berhasil dihapus", "id": id })),
        )
            .into_response(),
        _ => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Tombol tidak ditemukan" })),
        )
            .into_response(),
    }
}

async fn get_logs(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let logs = sqlx::query_as::<_, BellLog>(
        r#"
        SELECT bl.id, bl.schedule_item_id, bl.audio_id, bl.event_title, bl.trigger_source,
               DATE_FORMAT(bl.played_at, '%d %b %Y %H:%i:%s') as played_at, bl.status,
               al.title as audio_title
        FROM bell_logs bl
        LEFT JOIN audio_library al ON bl.audio_id = al.id
        ORDER BY bl.id DESC
        LIMIT 50
        "#,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(logs)
}

async fn update_settings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateSettingsRequest>,
) -> impl IntoResponse {
    if let Some(vol) = payload.master_volume {
        let clamped = vol.min(100).to_string();
        let _ = sqlx::query(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES ('master_volume', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        )
        .bind(clamped)
        .execute(&state.db)
        .await;
    }

    if let Some(mute) = payload.mute_mode {
        let val = if mute { "true" } else { "false" };
        let _ = sqlx::query(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES ('mute_mode', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        )
        .bind(val)
        .execute(&state.db)
        .await;
    }

    if let Some(name) = payload.school_name {
        let clean = name.trim();
        if !clean.is_empty() {
            let _ = sqlx::query(
                "INSERT INTO system_settings (setting_key, setting_value) VALUES ('school_name', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
            )
            .bind(clean)
            .execute(&state.db)
            .await;
        }
    }

    if let Some(tz_hours) = payload.timezone_offset_hours {
        let val = tz_hours.to_string();
        let _ = sqlx::query(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES ('timezone_offset_hours', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        )
        .bind(val)
        .execute(&state.db)
        .await;
    }

    if let Some(tz_name) = payload.timezone_name {
        let _ = sqlx::query(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES ('timezone_name', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        )
        .bind(tz_name)
        .execute(&state.db)
        .await;
    }

    if let Some(fmt) = payload.time_format {
        let clean_fmt = if fmt == "12H" { "12H" } else { "24H" };
        let _ = sqlx::query(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES ('time_format', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        )
        .bind(clean_fmt)
        .execute(&state.db)
        .await;
    }

    let settings = load_settings(&state.db).await;
    Json(settings)
}

async fn upload_school_logo(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut saved_filename = String::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let original_name = field.file_name().unwrap_or("logo.png").to_string();
            let ext = std::path::Path::new(&original_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("png")
                .to_lowercase();

            if !["png", "jpg", "jpeg", "webp", "svg"].contains(&ext.as_str()) {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "Format logo harus PNG, JPG, WEBP, atau SVG." })),
                )
                    .into_response();
            }

            let safe_name = format!("school_logo_{}.{}", chrono::Utc::now().timestamp(), ext);
            let target_path = format!("{}/{}", state.branding_dir, safe_name);

            if let Ok(bytes) = field.bytes().await {
                if bytes.len() > 5 * 1024 * 1024 {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({ "error": "Ukuran logo maksimal 5 MB." })),
                    )
                        .into_response();
                }
                if let Err(e) = tokio::fs::write(&target_path, &bytes).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": format!("Gagal menyimpan logo: {}", e) })),
                    )
                        .into_response();
                }
                saved_filename = safe_name;
            }
        }
    }

    if saved_filename.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "File logo wajib dipilih." })),
        )
            .into_response();
    }

    let logo_url = format!("/branding/{}", saved_filename);
    let _ = sqlx::query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('school_logo', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
    )
    .bind(&logo_url)
    .execute(&state.db)
    .await;

    let settings = load_settings(&state.db).await;
    Json(settings).into_response()
}

async fn reset_school_logo(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let _ = sqlx::query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('school_logo', '/logo-sekolah.png') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
    )
    .execute(&state.db)
    .await;

    let settings = load_settings(&state.db).await;
    Json(settings)
}

async fn trigger_manual_bell(
    Path(audio_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let audio = sqlx::query_as::<_, AudioItem>(
        "SELECT id, title, filename, file_path, duration_seconds, category FROM audio_library WHERE id = ? LIMIT 1",
    )
    .bind(audio_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let Some(audio) = audio else {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "File audio tidak ditemukan" })),
        )
            .into_response();
    };

    let settings = load_settings(&state.db).await;
    let status = if settings.mute_mode {
        "STOPPED_MANUALLY"
    } else {
        "PLAYED"
    };

    let insert_query = r#"
        INSERT INTO bell_logs (schedule_item_id, audio_id, event_title, trigger_source, played_at, status)
        VALUES (NULL, ?, ?, 'WEB_REMOTE', NOW(), ?)
    "#;
    let _ = sqlx::query(insert_query)
        .bind(audio.id)
        .bind(format!("Manual: {}", audio.title))
        .bind(status)
        .execute(&state.db)
        .await;

    Json(TriggerResponse {
        message: if settings.mute_mode {
            "Mode senyap aktif, dicatat tanpa membunyikan suara".to_string()
        } else {
            format!("Memutar {}", audio.title)
        },
        audio_id: audio.id,
        title: audio.title,
        audio_url: format!("/audio/{}", audio.filename),
        volume: settings.master_volume,
        muted: settings.mute_mode,
    })
    .into_response()
}
