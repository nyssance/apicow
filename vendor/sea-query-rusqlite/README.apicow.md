# SeaQuery SQLite compatibility patch

Source: sea-query-rusqlite 0.8.0, https://github.com/SeaQL/sea-query.
Upstream license: MIT OR Apache-2.0; source files are unchanged.
The sole manifest change is rusqlite 0.38 → 0.41 so the workspace can use one
SQLite native library with rusqlite 0.41 / sqlite-wasm-rs 0.6. Remove this patch
when a published sea-query-rusqlite release supports rusqlite 0.41.
