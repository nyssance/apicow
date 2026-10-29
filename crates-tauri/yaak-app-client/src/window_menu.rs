use std::sync::atomic::{AtomicBool, Ordering};

static CHINESE: AtomicBool = AtomicBool::new(false);

pub fn set_locale(locale: &str) {
    CHINESE.store(locale == "zh-CN", Ordering::Relaxed);
}

fn text(source: &'static str) -> &'static str {
    if !CHINESE.load(Ordering::Relaxed) {
        return source;
    }
    match source {
        "Window" => "窗口",
        "Help" => "帮助",
        "Settings" => "设置",
        "File" => "文件",
        "Edit" => "编辑",
        "View" => "显示",
        "Zoom to Actual Size" => "实际大小",
        "Zoom In" => "放大",
        "Zoom Out" => "缩小",
        "Develop" => "开发",
        "Refresh" => "刷新",
        "Open Devtools" => "打开开发者工具",
        "Reset Size" => "重置尺寸",
        "Resize to 16x9" => "调整为 16:9",
        "Resize to 16x10" => "调整为 16:10",
        "Generate Theme CSS" => "生成主题 CSS",
        "Show Home Screen" => "显示首页",
        "Minimize" => "最小化",
        "Maximize" => "缩放",
        "Close Window" => "关闭窗口",
        "About ApiCow" => "关于 ApiCow",
        "Services" => "服务",
        "Hide ApiCow" => "隐藏 ApiCow",
        "Hide Others" => "隐藏其他",
        "Quit ApiCow" => "退出 ApiCow",
        "Undo" => "撤销",
        "Redo" => "重做",
        "Cut" => "剪切",
        "Copy" => "复制",
        "Paste" => "粘贴",
        "Select All" => "全选",
        "Enter Full Screen" => "进入全屏",
        _ => source,
    }
}

pub use tauri::AppHandle;
use tauri::Runtime;
use tauri::menu::{
    AboutMetadata, HELP_SUBMENU_ID, Menu, MenuItemBuilder, PredefinedMenuItem, Submenu,
    WINDOW_SUBMENU_ID,
};

pub fn app_menu<R: Runtime>(app_handle: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pkg_info = app_handle.package_info();
    let config = app_handle.config();
    let about_metadata = AboutMetadata {
        name: Some(pkg_info.name.clone()),
        version: Some(pkg_info.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config.bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };

    let window_menu = Submenu::with_id_and_items(
        app_handle,
        WINDOW_SUBMENU_ID,
        text("Window"),
        true,
        &[
            &PredefinedMenuItem::minimize(app_handle, Some(text("Minimize")))?,
            &PredefinedMenuItem::maximize(app_handle, Some(text("Maximize")))?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app_handle)?,
            &PredefinedMenuItem::close_window(app_handle, Some(text("Close Window")))?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    {
        window_menu.set_as_windows_menu_for_nsapp()?;
    }

    let help_menu = Submenu::with_id_and_items(
        app_handle,
        HELP_SUBMENU_ID,
        text("Help"),
        true,
        &[
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::about(
                app_handle,
                Some(text("About ApiCow")),
                Some(about_metadata.clone()),
            )?,
            #[cfg(target_os = "macos")]
            &MenuItemBuilder::with_id("open_feedback".to_string(), "Give Feedback")
                .build(app_handle)?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    {
        help_menu.set_as_windows_menu_for_nsapp()?;
    }

    let menu = Menu::with_items(
        app_handle,
        &[
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app_handle,
                pkg_info.name.clone(),
                true,
                &[
                    &PredefinedMenuItem::about(
                        app_handle,
                        Some(text("About ApiCow")),
                        Some(about_metadata),
                    )?,
                    &PredefinedMenuItem::separator(app_handle)?,
                    &MenuItemBuilder::with_id("settings".to_string(), text("Settings"))
                        .accelerator("CmdOrCtrl+,")
                        .build(app_handle)?,
                    &PredefinedMenuItem::separator(app_handle)?,
                    &PredefinedMenuItem::services(app_handle, Some(text("Services")))?,
                    &PredefinedMenuItem::separator(app_handle)?,
                    &PredefinedMenuItem::hide(app_handle, Some(text("Hide ApiCow")))?,
                    &PredefinedMenuItem::hide_others(app_handle, Some(text("Hide Others")))?,
                    &PredefinedMenuItem::separator(app_handle)?,
                    // NOTE: Replace the predefined quit item with a custom one because, for some
                    //  reason, ExitRequested events are not fired on cmd+Q. Perhaps this will be
                    //  fixed in the future?
                    //  https://github.com/tauri-apps/tauri/issues/9198
                    &MenuItemBuilder::with_id("hacked_quit".to_string(), text("Quit ApiCow"))
                        .accelerator("CmdOrCtrl+q")
                        .build(app_handle)?,
                ],
            )?,
            #[cfg(not(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            )))]
            &Submenu::with_items(
                app_handle,
                text("File"),
                true,
                &[
                    &PredefinedMenuItem::close_window(app_handle, Some(text("Close Window")))?,
                    #[cfg(not(target_os = "macos"))]
                    &PredefinedMenuItem::quit(app_handle, Some(text("Quit ApiCow")))?,
                ],
            )?,
            &Submenu::with_items(
                app_handle,
                text("Edit"),
                true,
                &[
                    &PredefinedMenuItem::undo(app_handle, Some(text("Undo")))?,
                    &PredefinedMenuItem::redo(app_handle, Some(text("Redo")))?,
                    &PredefinedMenuItem::separator(app_handle)?,
                    &PredefinedMenuItem::cut(app_handle, Some(text("Cut")))?,
                    &PredefinedMenuItem::copy(app_handle, Some(text("Copy")))?,
                    &PredefinedMenuItem::paste(app_handle, Some(text("Paste")))?,
                    &PredefinedMenuItem::select_all(app_handle, Some(text("Select All")))?,
                ],
            )?,
            &Submenu::with_items(
                app_handle,
                text("View"),
                true,
                &[
                    #[cfg(target_os = "macos")]
                    &PredefinedMenuItem::fullscreen(app_handle, Some(text("Enter Full Screen")))?,
                    #[cfg(target_os = "macos")]
                    &PredefinedMenuItem::separator(app_handle)?,
                    &MenuItemBuilder::with_id(
                        "zoom_reset".to_string(),
                        text("Zoom to Actual Size"),
                    )
                    .accelerator("CmdOrCtrl+0")
                    .build(app_handle)?,
                    &MenuItemBuilder::with_id("zoom_in".to_string(), text("Zoom In"))
                        .accelerator("CmdOrCtrl+=")
                        .build(app_handle)?,
                    &MenuItemBuilder::with_id("zoom_out".to_string(), text("Zoom Out"))
                        .accelerator("CmdOrCtrl+-")
                        .build(app_handle)?,
                ],
            )?,
            &window_menu,
            &help_menu,
            #[cfg(dev)]
            &Submenu::with_items(
                app_handle,
                text("Develop"),
                true,
                &[
                    &MenuItemBuilder::with_id("dev.refresh".to_string(), text("Refresh"))
                        .accelerator("CmdOrCtrl+Shift+r")
                        .build(app_handle)?,
                    &MenuItemBuilder::with_id(
                        "dev.toggle_devtools".to_string(),
                        text("Open Devtools"),
                    )
                    .accelerator("CmdOrCtrl+Option+i")
                    .build(app_handle)?,
                    &MenuItemBuilder::with_id("dev.reset_size".to_string(), text("Reset Size"))
                        .build(app_handle)?,
                    &MenuItemBuilder::with_id(
                        "dev.reset_size_16x9".to_string(),
                        text("Resize to 16x9"),
                    )
                    .build(app_handle)?,
                    &MenuItemBuilder::with_id(
                        "dev.reset_size_16x10".to_string(),
                        text("Resize to 16x10"),
                    )
                    .build(app_handle)?,
                    &MenuItemBuilder::with_id(
                        "dev.generate_theme_css".to_string(),
                        text("Generate Theme CSS"),
                    )
                    .build(app_handle)?,
                    &MenuItemBuilder::with_id(
                        "dev.show_home".to_string(),
                        text("Show Home Screen"),
                    )
                    .build(app_handle)?,
                ],
            )?,
        ],
    )?;

    Ok(menu)
}
