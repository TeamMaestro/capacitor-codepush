package com.microsoft.capacitor.http;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.json.JSONArray;
import org.json.JSONException;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.Iterator;

public class HttpRequestHandler extends com.getcapacitor.plugin.util.HttpRequestHandler {
    /**
     * Makes an Http Request to download a file based on the PluginCall parameters
     * @param call The Capacitor PluginCall that contains the options need for an Http request
     * @param context The Android Context required for writing to the filesystem
     * @param progress The emitter which notifies listeners on downloading progression
     * @throws IOException throws an IO request when a connection can't be made
     * @throws URISyntaxException thrown when the URI is malformed
     */
    public static void downloadFile(PluginCall call, Context context, ProgressEmitter progress)
            throws IOException, URISyntaxException, JSONException {
        String urlString = call.getString("url");
        String method = call.getString("method", "GET").toUpperCase();
        String filePath = call.getString("filePath");
        String fileDirectory = call.getString("fileDirectory", FilesystemUtils.DIRECTORY_DOCUMENTS);
        JSObject headers = call.getObject("headers");
        JSObject params = call.getObject("params");
        Integer connectTimeout = call.getInt("connectTimeout");
        Integer readTimeout = call.getInt("readTimeout");

        final URL url = new URL(urlString);
        final File file = FilesystemUtils.getFileObject(context, filePath, fileDirectory);

        HttpURLConnectionBuilder connectionBuilder = new HttpURLConnectionBuilder()
                .setUrl(url)
                .setMethod(method)
                .setHeaders(headers)
                .setUrlParams(params)
                .setConnectTimeout(connectTimeout)
                .setReadTimeout(readTimeout)
                .openConnection();

        ICapacitorHttpUrlConnection connection = connectionBuilder.build();
        InputStream connectionInputStream = connection.getInputStream();

        FileOutputStream fileOutputStream = new FileOutputStream(file, false);

        String contentLength = connection.getHeaderField("content-length");
        int bytes = 0;
        int maxBytes = 0;

        try {
            maxBytes = contentLength != null ? Integer.parseInt(contentLength) : 0;
        } catch (NumberFormatException e) {
            maxBytes = 0;
        }

        byte[] buffer = new byte[1024];
        int len;

        while ((len = connectionInputStream.read(buffer)) > 0) {
            fileOutputStream.write(buffer, 0, len);

            bytes += len;
            progress.emit(bytes, maxBytes);
        }

        connectionInputStream.close();
        fileOutputStream.close();

        call.resolve(new JSObject() {
            {
                put("path", file.getAbsolutePath());
            }
        });
    }


    private static class HttpURLConnectionBuilder {

        private Integer connectTimeout;
        private Integer readTimeout;
        private Boolean disableRedirects;
        private JSObject headers;
        private String method;
        private URL url;

        private CapacitorHttpUrlConnection connection;

        public HttpURLConnectionBuilder setConnectTimeout(Integer connectTimeout) {
            this.connectTimeout = connectTimeout;
            return this;
        }

        public HttpURLConnectionBuilder setReadTimeout(Integer readTimeout) {
            this.readTimeout = readTimeout;
            return this;
        }

        public HttpURLConnectionBuilder setDisableRedirects(Boolean disableRedirects) {
            this.disableRedirects = disableRedirects;
            return this;
        }

        public HttpURLConnectionBuilder setHeaders(JSObject headers) {
            this.headers = headers;
            return this;
        }

        public HttpURLConnectionBuilder setMethod(String method) {
            this.method = method;
            return this;
        }

        public HttpURLConnectionBuilder setUrl(URL url) {
            this.url = url;
            return this;
        }

        public HttpURLConnectionBuilder openConnection() throws IOException {
            connection = new CapacitorHttpUrlConnection((HttpURLConnection) url.openConnection());

            connection.setAllowUserInteraction(false);
            connection.setRequestMethod(method);

            if (connectTimeout != null) connection.setConnectTimeout(connectTimeout);
            if (readTimeout != null) connection.setReadTimeout(readTimeout);
            if (disableRedirects != null) connection.setDisableRedirects(disableRedirects);

            connection.setRequestHeaders(headers);
            return this;
        }

        public HttpURLConnectionBuilder setUrlParams(JSObject params) throws MalformedURLException, URISyntaxException, JSONException {
            return this.setUrlParams(params, true);
        }

        public HttpURLConnectionBuilder setUrlParams(JSObject params, boolean shouldEncode)
                throws URISyntaxException, MalformedURLException {
            String initialQuery = url.getQuery();
            String initialQueryBuilderStr = initialQuery == null ? "" : initialQuery;

            Iterator<String> keys = params.keys();

            if (!keys.hasNext()) {
                return this;
            }

            StringBuilder urlQueryBuilder = new StringBuilder(initialQueryBuilderStr);

            // Build the new query string
            while (keys.hasNext()) {
                String key = keys.next();

                // Attempt as JSONArray and fallback to string if it fails
                try {
                    StringBuilder value = new StringBuilder();
                    JSONArray arr = params.getJSONArray(key);
                    for (int x = 0; x < arr.length(); x++) {
                        value.append(key).append("=").append(arr.getString(x));
                        if (x != arr.length() - 1) {
                            value.append("&");
                        }
                    }
                    if (urlQueryBuilder.length() > 0) {
                        urlQueryBuilder.append("&");
                    }
                    urlQueryBuilder.append(value);
                } catch (JSONException e) {
                    if (urlQueryBuilder.length() > 0) {
                        urlQueryBuilder.append("&");
                    }
                    urlQueryBuilder.append(key).append("=").append(params.getString(key));
                }
            }

            String urlQuery = urlQueryBuilder.toString();

            URI uri = url.toURI();
            if (shouldEncode) {
                URI encodedUri = new URI(uri.getScheme(), uri.getAuthority(), uri.getPath(), urlQuery, uri.getFragment());
                this.url = encodedUri.toURL();
            } else {
                String unEncodedUrlString = uri.getScheme() + "://" + uri.getAuthority() + uri.getPath() + ((!urlQuery.equals("")) ? "?" + urlQuery : "") + ((uri.getFragment() != null) ? uri.getFragment() : "");
                this.url = new URL(unEncodedUrlString);
            }

            return this;
        }

        public CapacitorHttpUrlConnection build() {
            return connection;
        }
    }

}
