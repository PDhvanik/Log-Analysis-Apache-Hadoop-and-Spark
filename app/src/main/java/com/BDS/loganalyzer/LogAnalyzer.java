package com.BDS.loganalyzer;

import com.BDS.loganalyzer.model.LogRecord;
import org.apache.spark.sql.*;
import org.apache.spark.api.java.function.FilterFunction;
import org.apache.spark.api.java.function.MapFunction;
import static org.apache.spark.sql.functions.*;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class LogAnalyzer {

   // Regex to parse a standard Apache combined log format line
   private static final String LOG_REGEX = "^(\\S+) (\\S+) (\\S+) \\[([\\w:/]+\\s[+\\-]\\d{4})\\] \"(\\S+) (\\S+) (\\S+)\" (\\d{3}) (\\d+|-)";
   private static final Pattern PATTERN = Pattern.compile(LOG_REGEX);

   public static void main(String[] args) {
      if (args.length < 2) {
         System.err.println("Usage: LogAnalyzer <input-path> <output-path>");
         System.exit(1);
      }
      String inputPath = args[0];
      String outputPath = args[1];

      // 1. Initialize SparkSession
      SparkSession spark = SparkSession.builder()
            .appName("Java Log Analyzer")
            .getOrCreate();

      // 2. Load the raw log files from HDFS into a Dataset of strings
      Dataset<String> rawLogs = spark.read().textFile(inputPath);

      // 3. Parse the logs and convert to a Dataset of LogRecord objects
      Encoder<LogRecord> logRecordEncoder = Encoders.bean(LogRecord.class);
      Dataset<LogRecord> parsedLogs = rawLogs.map((MapFunction<String, LogRecord>) line -> {
         Matcher matcher = PATTERN.matcher(line);
         if (matcher.find()) {
            String sizeStr = matcher.group(9);
            long responseSize = "-".equals(sizeStr) ? 0L : Long.parseLong(sizeStr);
            return new LogRecord(
                  matcher.group(1), // IP Address
                  matcher.group(4), // Timestamp
                  matcher.group(5), // Method
                  matcher.group(6), // URL
                  Integer.parseInt(matcher.group(8)), // Status Code
                  responseSize // Response Size
            );
         }
         return null; // Return null for lines that don't match
      }, logRecordEncoder).filter((FilterFunction<LogRecord>) record -> record != null);

      // Cache the parsed logs since we'll use them for multiple analyses
      parsedLogs.cache();

      // 4. Perform Analyses

      // Analysis 1: Count HTTP Status Codes
      Dataset<Row> statusCounts = parsedLogs.groupBy("statusCode")
            .count()
            .orderBy(col("count").desc());
      statusCounts.write().mode(SaveMode.Overwrite).json(outputPath + "/status_counts");

      // Analysis 2: Find top 10 most requested URLs
      Dataset<Row> topUrls = parsedLogs.groupBy("url")
            .count()
            .orderBy(col("count").desc())
            .limit(10);
      topUrls.write().mode(SaveMode.Overwrite).json(outputPath + "/top_urls");

      // Analysis 3: Find top 10 IP addresses
      Dataset<Row> topIps = parsedLogs.groupBy("ipAddress")
            .count()
            .orderBy(col("count").desc())
            .limit(10);
      topIps.write().mode(SaveMode.Overwrite).json(outputPath + "/top_ips");

      // 5. Stop the SparkSession
      spark.stop();
   }
}