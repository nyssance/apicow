# ApiCow 性能基线

2026-10-29，Apple M4 / macOS Darwin 27.2.0 / arm64。代码版本 `f16429a84116b80a36fca55d83d2ff57640fa272`，采样时工作区干净，已结束本轮构建和测试进程。

使用打包的 Debug Wry + Hasgard Test 应用，原生 Rust 临时请求接口访问本机 HTTP 服务。每组预热 4 次、测量 20 次，逐字校验响应内容。原始逐次结果见 [JSON](benchmarks/native-http-2026-10-29.json)。

| 响应大小 | 应用内部耗时中位数 | 内部 p95 | 含调试桥耗时中位数 | 含调试桥 p95 |
| -------- | -----------------: | -------: | -----------------: | -----------: |
| 1 KiB    |               1 ms |     1 ms |           14.71 ms |    15.175 ms |
| 64 KiB   |               2 ms |     2 ms |           37.13 ms |    37.998 ms |

应用内部耗时取真实响应的 `elapsed` 字段，只有毫秒精度；不能从 1 ms 推断亚毫秒性能。含调试桥耗时还包含 Hasgard CLI 启动、IPC 和响应字节的 JSON 传输，不能当作用户界面响应时间。

这是可重复的 ApiCow 自身基线，没有运行同条件的原版 Yaak，也不是发布版、并发吞吐、首启、内存或大工作区基准。因此不能据此宣称比 Yaak 更快或性能最佳。

复现：先启动隔离的 ApiCow Test 应用，结束本机编译和其他测试，再运行：

```sh
TAURI_HASGARD_SOCKET=/tmp/apicow-hasgard.sock npm run bench:native -- /tmp/apicow-benchmark.json
```
