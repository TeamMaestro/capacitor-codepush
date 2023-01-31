//
//  Base.swift
//  Plugin
//
//  Created by Robin Fournier on 31.01.23.
//  Copyright © 2023 Max Lynch. All rights reserved.
//

import Capacitor
import Foundation

@objcMembers public class HttpBase: NSObject {
    public static func downloadFile(_ call: CAPPluginCall, _ plugin: CAPPlugin) {
        // Protect against bad values from JS before calling request
        guard let u = call.getString("url") else { return call.reject("Must provide a URL") }
        guard let _ = call.getString("filePath") else { return call.reject("Must provide a file path to download the file to") }
        guard let _ = URL(string: u) else { return call.reject("Invalid URL") }

        let progressEmitter: HttpRequestHandler.ProgressEmitter = {bytes, contentLength in
            plugin.notifyListeners("progress", data: [
                "type": "DOWNLOAD",
                "url": u,
                "bytes": bytes,
                "contentLength": contentLength
            ])
        }

        do {
            try HttpRequestHandler.download(call, updateProgress: progressEmitter)
        } catch let e {
            call.reject(e.localizedDescription)
        }
    }
}
