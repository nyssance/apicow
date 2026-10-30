use crate::error::Result;
use tauri::{AppHandle, Runtime};
use tauri_plugin_opener::OpenerExt;
use yaak_common::platform::get_os_str;

pub async fn send_feedback<R: Runtime>(
    app_handle: &AppHandle<R>,
    feature: String,
    text: String,
) -> Result<()> {
    let mut url = url::Url::parse("https://github.com/nyssance/apicow/issues/new")
        .expect("valid feedback URL");
    url.query_pairs_mut().append_pair("title", &format!("Feedback: {feature}")).append_pair(
        "body",
        &format!("{text}\n\nApiCow {} ({})", app_handle.package_info().version, get_os_str()),
    );
    app_handle.opener().open_url(url.as_str(), None::<&str>)?;
    Ok(())
}
