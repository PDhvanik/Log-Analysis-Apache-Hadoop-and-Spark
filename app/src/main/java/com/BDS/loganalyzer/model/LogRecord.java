package com.BDS.loganalyzer.model;

import java.io.Serializable;

public class LogRecord implements Serializable {
    private String ipAddress;
    private String timestamp;
    private String method;
    private String url;
    private Integer statusCode;
    private Long responseSize;

    // Constructors, Getters, and Setters
    public LogRecord() {
    }

    public LogRecord(String ipAddress, String timestamp, String method, String url, Integer statusCode, Long responseSize) {
        this.ipAddress = ipAddress;
        this.timestamp = timestamp;
        this.method = method;
        this.url = url;
        this.statusCode = statusCode;
        this.responseSize = responseSize;
    }

    // Getters and Setters
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Integer getStatusCode() { return statusCode; }
    public void setStatusCode(Integer statusCode) { this.statusCode = statusCode; }

    public Long getResponseSize() { return responseSize; }
    public void setResponseSize(Long responseSize) { this.responseSize = responseSize; }
}