fn main() {
    // A custom capability glob bypasses Tauri's default directory watch.
    println!("cargo:rerun-if-changed=capabilities");
    let pattern = if std::env::var_os("CARGO_FEATURE_HASGARD_TESTING").is_some() {
        "./capabilities/**/*.json"
    } else {
        "./capabilities/*.json"
    };
    tauri_build::try_build(tauri_build::Attributes::new().capabilities_path_pattern(pattern))
        .expect("failed to build Tauri capabilities");
}
