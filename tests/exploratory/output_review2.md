**[Copilot](https://github.com/apps/copilot-pull-request-reviewer) AI** reviewed  [May 29, 2026](https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1#pullrequestreview-4394328318)

[View reviewed changes](https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1/changes)

**Copilot** (AI):
> Pull request overview
> 
> Copilot reviewed 45 out of 46 changed files in this pull request and generated 16 comments.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt`
**Copilot** (AI) _(2026-05-30T04:12:43.000Z)_:
> Comment on lines +24 to +28
> 
> ```
> +                                                                                                                                                                                                                                                                                            //                                                                                                                                                Set                                                                                                                                                CORS                                                                                                                                                headers
> +                                                                                                                                                                                                                                                                                            val                                                                                                                                                origin                                                                                                                                                =                                                                                                                                                exchange.requestHeaders.getFirst("Origin")                                                                                                                                                ?:                                                                                                                                                "*"
> +                                                                                                                                                                                                                                                                                            exchange.responseHeaders.set("Access-Control-Allow-Origin",                                                                                                                                                origin)
> +                                                                                                                                                                                                                                                                                            exchange.responseHeaders.set("Access-Control-Allow-Methods",                                                                                                                                                "POST,                                                                                                                                                GET,                                                                                                                                                OPTIONS")
> +                                                                                                                                                                                                                                                                                            exchange.responseHeaders.set("Access-Control-Allow-Headers",                                                                                                                                                "Content-Type,                                                                                                                                                Authorization")
> ```
> 
> `Access-Control-Allow-Origin` is currently set to whatever `Origin` header is provided (or `*`). For the loopback OAuth callback, this allows any local web page to make cross-origin POSTs to the callback endpoint and read responses, which is unnecessarily permissive for an auth credential handoff. Restrict CORS to the expected web origins (prod + emulator) and reject POSTs from unknown origins.
> 
> ```diff
> # File: core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt
> @@ -21,9 +21,21 @@
>  
>          activeServer.createContext("/callback") { exchange ->
>              try {
> -                // Set CORS headers
> -                val origin = exchange.requestHeaders.getFirst("Origin") ?: "*"
> -                exchange.responseHeaders.set("Access-Control-Allow-Origin", origin)
> +                // Set CORS headers (restrict to trusted origins)
> +                val origin = exchange.requestHeaders.getFirst("Origin")
> +                val allowedOrigins = setOf(
> +                    "https://codeoba.firebaseapp.com",
> +                    "http://localhost:5000"
> +                )
> +                val allowedOrigin = origin?.takeIf { it in allowedOrigins }
> +                if (exchange.requestMethod.equals("POST", ignoreCase = true) && allowedOrigin == null) {
> +                    exchange.sendResponseHeaders(403, -1)
> +                    exchange.close()
> +                    return@createContext
> +                }
> +                if (allowedOrigin != null) {
> +                    exchange.responseHeaders.set("Access-Control-Allow-Origin", allowedOrigin)
> +                }
>                  exchange.responseHeaders.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
>                  exchange.responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
> ```

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt`
**Copilot** (AI) _(2026-05-30T04:12:43.000Z)_:
> Comment on lines +150 to +156
> 
> ```
> +                                                                                                                                                                                                                                                                                            //                                                                                                                                                Terminate                                                                                                                                                server                                                                                                                                                asynchronously                                                                                                                                                shortly                                                                                                                                                after
> +                                                                                                                                                                                                                                                                                            Thread                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            try                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            Thread.sleep(1000)
> +                                                                                                                                                                                                                                                                                            stop()
> +                                                                                                                                                                                                                                                                                            }                                                                                                                                                catch                                                                                                                                                (_:                                                                                                                                                Exception)                                                                                                                                                {}
> +                                                                                                                                                                                                                                                                                            }.start()
> ```
> 
> The cleanup thread started in the `finally` block is non-daemon. If the app is closed shortly after an auth callback, this thread can keep the JVM alive longer than necessary. Mark the thread as daemon (or use a scheduled executor) to avoid shutdown hangs.
> 
> ```diff
> # File: core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt
> @@ -153,7 +153,7 @@
>                          Thread.sleep(1000)
>                          stop()
>                      } catch (_: Exception) {}
> -                }.start()
> +                }.apply { isDaemon = true }.start()
>              }
>          }
> ```

### File: `core/src/commonMain/kotlin/llc/lookatwhataicando/codeoba/core/domain/parser/LogParser.kt`
**Copilot** (AI) _(2026-05-30T04:12:44.000Z)_:
> Comment on lines +122 to +136
> 
> ```
> +                                                                                                                                                                                                                                                                                            return                                                                                                                                                """
> +                                                                                                                                                                                                                                                                                            {
> +                                                                                                                                                                                                                                                                                            "keyActions":                                                                                                                                                [
> +                                                                                                                                                                                                                                                                                            ${actions.joinToString(",")                                                                                                                                                {                                                                                                                                                "\"$it\""                                                                                                                                                }}
> +                                                                                                                                                                                                                                                                                            ],
> +                                                                                                                                                                                                                                                                                            "errors":                                                                                                                                                [
> +                                                                                                                                                                                                                                                                                            ${errors.joinToString(",")                                                                                                                                                {                                                                                                                                                "\"$it\""                                                                                                                                                }}
> +                                                                                                                                                                                                                                                                                            ],
> +                                                                                                                                                                                                                                                                                            "performanceCharts":                                                                                                                                                [
> +                                                                                                                                                                                                                                                                                            {"label":                                                                                                                                                "Lexical                                                                                                                                                Search                                                                                                                                                Speed",                                                                                                                                                "value":                                                                                                                                                $lexicalSpeed},
> +                                                                                                                                                                                                                                                                                            {"label":                                                                                                                                                "Semantic                                                                                                                                                Search                                                                                                                                                Speed",                                                                                                                                                "value":                                                                                                                                                $semanticSpeed},
> +                                                                                                                                                                                                                                                                                            {"label":                                                                                                                                                "Directory                                                                                                                                                Watcher                                                                                                                                                Latency",                                                                                                                                                "value":                                                                                                                                                $watcherLatency}
> +                                                                                                                                                                                                                                                                                            ]
> +                                                                                                                                                                                                                                                                                            }
> +                                                                                                                                                                                                                                                                                            """.trimIndent()
> ```
> 
> `LocalModelRunner.runLocalInference` builds JSON via string interpolation without escaping. Since `actions`/`errors` can contain quotes/newlines (e.g., excerpts from user messages), this can easily produce invalid JSON and force the summarizer into its error fallback. Build the JSON using `kotlinx.serialization` instead so strings are correctly escaped.
> 
> ```diff
> # File: core/src/commonMain/kotlin/llc/lookatwhataicando/codeoba/core/domain/parser/LogParser.kt
> @@ -119,20 +119,15 @@
>          val semanticSpeed = (100.0 + (turnCount * 5.2)).coerceAtMost(250.0)
>          val watcherLatency = (10.0 + (turnCount * 0.8)).coerceAtMost(50.0)
>  
> -        return """
> -        {
> -          "keyActions": [
> -            ${actions.joinToString(",") { "\"$it\"" }}
> -          ],
> -          "errors": [
> -            ${errors.joinToString(",") { "\"$it\"" }}
> -          ],
> -          "performanceCharts": [
> -            {"label": "Lexical Search Speed", "value": $lexicalSpeed},
> -            {"label": "Semantic Search Speed", "value": $semanticSpeed},
> -            {"label": "Directory Watcher Latency", "value": $watcherLatency}
> -          ]
> -        }
> -        """.trimIndent()
> +        val summary = SessionSummary(
> +            keyActions = actions,
> +            errors = errors,
> +            performanceCharts = listOf(
> +                PerformanceChartPoint("Lexical Search Speed", lexicalSpeed),
> +                PerformanceChartPoint("Semantic Search Speed", semanticSpeed),
> +                PerformanceChartPoint("Directory Watcher Latency", watcherLatency)
> +            )
> +        )
> +        return kotlinx.serialization.json.Json.encodeToString(SessionSummary.serializer(), summary)
>      }
>  }
> ```

### File: `app-desktop/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/desktop/SettingsManager.kt`
**Copilot** (AI) _(2026-05-30T04:12:44.000Z)_:
> Comment on lines +256 to +264
> 
> ```
> +                                                                                                                                                                                                                                                                                            fun                                                                                                                                                getExcludedPaths():                                                                                                                                                List<String>                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            val                                                                                                                                                value                                                                                                                                                =                                                                                                                                                prefs.get("excluded_paths",                                                                                                                                                "")
> +                                                                                                                                                                                                                                                                                            if                                                                                                                                                (value.isEmpty())                                                                                                                                                return                                                                                                                                                emptyList()
> +                                                                                                                                                                                                                                                                                            return                                                                                                                                                value.split(",")
> +                                                                                                                                                                                                                                                                                            }
> +
> +                                                                                                                                                                                                                                                                                            fun                                                                                                                                                setExcludedPaths(paths:                                                                                                                                                List<String>)                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            prefs.put("excluded_paths",                                                                                                                                                paths.filter                                                                                                                                                {                                                                                                                                                it.isNotBlank()                                                                                                                                                }.joinToString(","))
> +                                                                                                                                                                                                                                                                                            }
> ```
> 
> `excluded_paths` is stored as a comma-separated string. This breaks if a path contains a comma and also makes future extensions harder. Prefer storing a JSON array string (and keep a backwards-compatible read path for existing comma-separated values).
> 
> ```diff
> # File: app-desktop/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/desktop/SettingsManager.kt
> @@ -257,11 +257,20 @@ object SettingsManager {
>      fun getExcludedPaths(): List<String> {
>          val value = prefs.get("excluded_paths", "")
>          if (value.isEmpty()) return emptyList()
> -        return value.split(",")
> +        return try {
> +            if (value.trim().startsWith("[")) {
> +                kotlinx.serialization.json.Json.decodeFromString(value)
> +            } else {
> +                value.split(",")
> +            }
> +        } catch (_: Exception) {
> +            value.split(",")
> +        }
>      }
>  
>      fun setExcludedPaths(paths: List<String>) {
> -        prefs.put("excluded_paths", paths.filter { it.isNotBlank() }.joinToString(","))
> +        val cleaned = paths.map { it.trim() }.filter { it.isNotBlank() }.distinct()
> +        prefs.put("excluded_paths", kotlinx.serialization.json.Json.encodeToString(cleaned))
>      }
>  
>      private fun putOrRemove(key: String, value: String?) {
> ```

### File: `app-desktop/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/desktop/SettingsDialog.kt`
**Copilot** (AI) _(2026-05-30T04:12:44.000Z)_:
> Comment on lines +303 to +310
> 
> ```
> +                                                                                                                                                                                                                                                                                            .clickable                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            if                                                                                                                                                (isSubscribed)                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            currentPreferredMode                                                                                                                                                =                                                                                                                                                ParserMode.STANDARD
> +                                                                                                                                                                                                                                                                                            SettingsManager.setPreferredParserMode(ParserMode.STANDARD)
> +                                                                                                                                                                                                                                                                                            LogParserFactory.setParserMode(ParserMode.STANDARD)
> +                                                                                                                                                                                                                                                                                            onSettingsChanged()
> +                                                                                                                                                                                                                                                                                            }
> +                                                                                                                                                                                                                                                                                            }
> ```
> 
> The "Standard Parsing" option shows a hand cursor but the click handler is a no-op when the user is not subscribed (`if (isSubscribed) { ... }`). Since Standard mode is always available, allow selecting it regardless of subscription status (this also avoids a misleading interactive affordance).
> 
> ```diff
> # File: app-desktop/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/desktop/SettingsDialog.kt
> @@ -301,12 +301,10 @@
>                                                          .clip(RoundedCornerShape(8.dp))
>                                                          .background(if (isStandardSelected) SlateSurface else Color.Transparent)
>                                                          .clickable {
> -                                                            if (isSubscribed) {
> -                                                                currentPreferredMode = ParserMode.STANDARD
> -                                                                SettingsManager.setPreferredParserMode(ParserMode.STANDARD)
> -                                                                LogParserFactory.setParserMode(ParserMode.STANDARD)
> -                                                                onSettingsChanged()
> -                                                            }
> +                                                            currentPreferredMode = ParserMode.STANDARD
> +                                                            SettingsManager.setPreferredParserMode(ParserMode.STANDARD)
> +                                                            LogParserFactory.setParserMode(ParserMode.STANDARD)
> +                                                            onSettingsChanged()
>                                                          }
>                                                          .pointerHoverIcon(PointerIcon(java.awt.Cursor.getPredefinedCursor(java.awt.Cursor.HAND_CURSOR)))
>                                                          .padding(horizontal = 12.dp, vertical = 8.dp),
> ```

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/security/DeviceKeyManager.kt`
**Copilot** (AI) _(2026-05-30T04:12:46.000Z)_:
> Comment on lines +14 to +21
> 
> ```
> +                                                                                                                                            object                                                                                                                                                DeviceKeyManager                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            private                                                                                                                                                val                                                                                                                                                keysDir                                                                                                                                                =                                                                                                                                                File(System.getProperty("user.home"),                                                                                                                                                ".codeoba/keys")
> +                                                                                                                                                                                                                                                                                            private                                                                                                                                                val                                                                                                                                                privateKeyFile                                                                                                                                                =                                                                                                                                                File(keysDir,                                                                                                                                                "device_private.der")
> +                                                                                                                                                                                                                                                                                            private                                                                                                                                                val                                                                                                                                                publicKeyFile                                                                                                                                                =                                                                                                                                                File(keysDir,                                                                                                                                                "device_public.der")
> +
> +                                                                                                                                                                                                                                                                                            init                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            keysDir.mkdirs()
> +                                                                                                                                                                                                                                                                                            }
> ```
> 
> `DeviceKeyManager` stores the RSA private key unencrypted on disk under `~/.codeoba/keys` on all platforms. This is materially weaker than the documented intent (OS-native secure storage / non-exportable keys) and makes key theft via filesystem access much easier. Consider storing the private key in the OS credential store/keystore (or at least encrypting it with an OS-protected secret) and using the on-disk key file only as a last-resort fallback.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/util/SecureStorage.kt`
**Copilot** (AI) _(2026-05-30T04:12:46.000Z)_:
> Comment on lines +9 to +14
> 
> ```
> +                                                                                                                                                                                                                                                                                            private                                                                                                                                                val                                                                                                                                                keyring:                                                                                                                                                Keyring?                                                                                                                                                =                                                                                                                                                try                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            Keyring.create()
> +                                                                                                                                                                                                                                                                                            }                                                                                                                                                catch                                                                                                                                                (e:                                                                                                                                                Throwable)                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            System.err.println("SecureStorage:                                                                                                                                                Native                                                                                                                                                Keyring                                                                                                                                                initialization                                                                                                                                                failed.                                                                                                                                                Falling                                                                                                                                                back                                                                                                                                                to                                                                                                                                                Java                                                                                                                                                Preferences.                                                                                                                                                Error:                                                                                                                                                ${e.message}")
> +                                                                                                                                                                                                                                                                                            null
> +                                                                                                                                                                                                                                                                                            }
> ```
> 
> `SecureStorage` falls back to `java.util.prefs.Preferences` when the native keyring is unavailable, which can result in refresh tokens and other credentials being stored in plaintext in a user-accessible store. If this fallback is required, it should be explicit/opt-in or replaced with an encrypted-at-rest fallback (e.g., a file encrypted with an OS-protected secret) to avoid silently weakening credential storage.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt`
**Copilot** (AI) _(2026-05-30T04:12:47.000Z)_:
> ```
> +
> +                                                                                                                                                                                                                                                                                            val                                                                                                                                                contentType                                                                                                                                                =                                                                                                                                                if                                                                                                                                                (isPost)                                                                                                                                                "application/json"                                                                                                                                                else                                                                                                                                                "text/html"
> +                                                                                                                                                                                                                                                                                            exchange.responseHeaders.set("Content-Type",                                                                                                                                                "$contentType;                                                                                                                                                charset=UTF-8")
> +                                                                                                                                                                                                                                                                                            exchange.sendResponseHeaders(200,                                                                                                                                                responseBody.toByteArray(Charsets.UTF_8).size.toLong())
> ```
> 
> `/callback` currently responds with HTTP 200 even when tokens are missing (POST path). For programmatic callers (the connect page) this makes it harder to detect failures and handle retries correctly. Return a 4xx status for missing tokens on POST.
> 
> ```diff
> # File: core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt
> @@ -135,7 +135,7 @@
>  
>                  val contentType = if (isPost) "application/json" else "text/html"
>                  exchange.responseHeaders.set("Content-Type", "$contentType; charset=UTF-8")
> -                exchange.sendResponseHeaders(200, responseBody.toByteArray(Charsets.UTF_8).size.toLong())
> +                exchange.sendResponseHeaders(if (isPost && (idToken == null || refreshToken == null)) 400 else 200, responseBody.toByteArray(Charsets.UTF_8).size.toLong())
>                  exchange.responseBody.write(responseBody.toByteArray(Charsets.UTF_8))
>                  exchange.close()
>              } catch (e: Exception) {
> ```

### File: `core/src/desktopTest/kotlin/llc/lookatwhataicando/codeoba/core/util/SecureStorageTest.kt`
**Copilot** (AI) _(2026-05-30T04:12:47.000Z)_:
> Comment on lines +7 to +20
> 
> ```
> +                                                                                                                                            class                                                                                                                                                SecureStorageTest                                                                                                                                                {
> +
> +                                                                                                                                                                                                                                                                                            @Test
> +                                                                                                                                                                                                                                                                                            fun                                                                                                                                                testSecureStorageOperations()                                                                                                                                                {
> +                                                                                                                                                                                                                                                                                            val                                                                                                                                                testKey                                                                                                                                                =                                                                                                                                                "test_key_credential_storage"
> +                                                                                                                                                                                                                                                                                            val                                                                                                                                                testVal                                                                                                                                                =                                                                                                                                                "superSecretTokenValue123"
> +
> +                                                                                                                                                                                                                                                                                            //                                                                                                                                                1.                                                                                                                                                Initial                                                                                                                                                state:                                                                                                                                                should                                                                                                                                                be                                                                                                                                                null                                                                                                                                                or                                                                                                                                                whatever                                                                                                                                                was                                                                                                                                                there
> +                                                                                                                                                                                                                                                                                            SecureStorage.delete(testKey)
> +                                                                                                                                                                                                                                                                                            assertNull(SecureStorage.get(testKey))
> +
> +                                                                                                                                                                                                                                                                                            //                                                                                                                                                2.                                                                                                                                                Put                                                                                                                                                value
> +                                                                                                                                                                                                                                                                                            SecureStorage.put(testKey,                                                                                                                                                testVal)
> +                                                                                                                                                                                                                                                                                            assertEquals(testVal,                                                                                                                                                SecureStorage.get(testKey))
> ```
> 
> This test exercises the real OS keyring when available. On developer machines and some CI environments, keyring access can be interactive (prompt/unlock), flaky, or leave side effects outside the repo. Consider isolating keyring integration tests behind an explicit opt-in flag and unit-test `SecureStorage` behavior by injecting/mocking the `Keyring` implementation.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/security/DeviceKeyManager.kt`
**Copilot** (AI):
> `DeviceKeyManager` stores the RSA private key unencrypted on disk under `~/.codeoba/keys` on all platforms. This is materially weaker than the documented intent (OS-native secure storage / non-exportable keys) and makes key theft via filesystem access much easier. Consider storing the private key in the OS credential store/keystore (or at least encrypting it with an OS-protected secret) and using the on-disk key file only as a last-resort fallback.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/util/SecureStorage.kt`
**Copilot** (AI):
> `SecureStorage` falls back to `java.util.prefs.Preferences` when the native keyring is unavailable, which can result in refresh tokens and other credentials being stored in plaintext in a user-accessible store. If this fallback is required, it should be explicit/opt-in or replaced with an encrypted-at-rest fallback (e.g., a file encrypted with an OS-protected secret) to avoid silently weakening credential storage.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt`
**Copilot** (AI):
> `Access-Control-Allow-Origin` is currently set to whatever `Origin` header is provided (or `*`). For the loopback OAuth callback, this allows any local web page to make cross-origin POSTs to the callback endpoint and read responses, which is unnecessarily permissive for an auth credential handoff. Restrict CORS to the expected web origins (prod + emulator) and reject POSTs from unknown origins.

### File: `core/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/core/auth/LocalAuthServer.kt`
**Copilot** (AI):
> The cleanup thread started in the `finally` block is non-daemon. If the app is closed shortly after an auth callback, this thread can keep the JVM alive longer than necessary. Mark the thread as daemon (or use a scheduled executor) to avoid shutdown hangs.

### File: `core/src/commonMain/kotlin/llc/lookatwhataicando/codeoba/core/domain/parser/LogParser.kt`
**Copilot** (AI):
> `LocalModelRunner.runLocalInference` builds JSON via string interpolation without escaping. Since `actions`/`errors` can contain quotes/newlines (e.g., excerpts from user messages), this can easily produce invalid JSON and force the summarizer into its error fallback. Build the JSON using `kotlinx.serialization` instead so strings are correctly escaped.

### File: `app-desktop/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/desktop/SettingsManager.kt`
**Copilot** (AI):
> `excluded_paths` is stored as a comma-separated string. This breaks if a path contains a comma and also makes future extensions harder. Prefer storing a JSON array string (and keep a backwards-compatible read path for existing comma-separated values).

### File: `app-desktop/src/desktopMain/kotlin/llc/lookatwhataicando/codeoba/desktop/SettingsDialog.kt`
**Copilot** (AI):
> The "Standard Parsing" option shows a hand cursor but the click handler is a no-op when the user is not subscribed (`if (isSubscribed) { ... }`). Since Standard mode is always available, allow selecting it regardless of subscription status (this also avoids a misleading interactive affordance).