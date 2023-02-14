package com.microsoft.capacitor.http;

import java.io.IOException;
import java.io.InputStream;

/**
 * This interface was extracted from {@link CapacitorHttpUrlConnection} to enable mocking that class.
 */
interface ICapacitorHttpUrlConnection {
    InputStream getErrorStream();

    String getHeaderField(String name);

    InputStream getInputStream() throws IOException;
}
