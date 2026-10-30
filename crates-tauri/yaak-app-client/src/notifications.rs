use crate::error::Result;
use crate::models_ext::QueryManagerExt;
use chrono::{DateTime, Utc};
use log::debug;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use ts_rs::TS;
use yaak_models::util::UpdateSource;

const KV_NAMESPACE: &str = "notifications";
const KV_KEY: &str = "seen";

// Create updater struct
pub struct YaakNotifier;

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "index.ts")]
pub struct YaakNotification {
    timestamp: DateTime<Utc>,
    timeout: Option<f64>,
    id: String,
    title: Option<String>,
    message: String,
    color: Option<String>,
    action: Option<YaakNotificationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "index.ts")]
pub struct YaakNotificationAction {
    label: String,
    url: String,
}

impl YaakNotifier {
    pub fn new() -> Self {
        Self
    }

    pub async fn seen<R: Runtime>(&mut self, window: &WebviewWindow<R>, id: &str) -> Result<()> {
        let app_handle = window.app_handle();
        let mut seen = get_kv(app_handle).await?;
        seen.push(id.to_string());
        debug!("Marked notification as seen {}", id);
        let seen_json = serde_json::to_string(&seen)?;
        window.with_tx(|tx| {
            tx.set_key_value_raw(
                KV_NAMESPACE,
                KV_KEY,
                seen_json.as_str(),
                &UpdateSource::from_window_label(window.label()),
            );
            Ok(())
        })?;
        Ok(())
    }

    pub async fn maybe_check<R: Runtime>(&mut self, _window: &WebviewWindow<R>) -> Result<()> {
        // ApiCow has no remote announcements service. Updates use the signed updater instead.
        Ok(())
    }
}

async fn get_kv<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Vec<String>> {
    match app_handle.db().get_key_value_raw("notifications", "seen") {
        None => Ok(Vec::new()),
        Some(v) => Ok(serde_json::from_str(&v.value)?),
    }
}
