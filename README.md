# Log Analyzer with Spark + Hadoop (Docker)

A hands-on project to analyze Apache access logs using Apache Spark running on a minimal Hadoop (HDFS) cluster, all orchestrated with Docker Compose. You will learn how to:

- Ingest log files into HDFS
- Parse logs with Spark (Java)
- Compute basic analytics (status counts, top URLs, top IPs)
- Explore results and UIs for both Spark and HDFS

---

## Project Structure

```
log-analyzer-project/
├─ app/
│  ├─ src/main/java/com/BDS/loganalyzer/LogAnalyzer.java        # Spark job entry point
│  ├─ src/main/java/com/BDS/loganalyzer/model/LogRecord.java    # Bean used for parsed records
│  └─ target/log-analyzer-1.0-SNAPSHOT.jar                      # Built JAR (after mvn package)
├─ data/
│  ├─ access.log                                                # Sample input log
│  └─ log_analysis_output/                                      # Optional local outputs (if using file:///)
├─ docker-compose.yaml                                          # Hadoop HDFS + Spark cluster
├─ hadoop.env                                                   # Extra Hadoop/YARN env vars (optional)
└─ README.md
```

---

## Components and Architecture

- `namenode` and `datanode` run HDFS. Default filesystem is `hdfs://namenode:9000`.
- `spark-master` and `spark-worker` run the Spark cluster. The master listens at `spark://spark-master:7077`.
- `./data` is mounted into both `spark-master` and `namenode` (as of your compose), so `/data/access.log` is available inside containers.
- The Spark job reads from an input path (HDFS or local) and writes results to an output path (recommended: HDFS).

Useful UIs once the cluster is up:

- HDFS NameNode UI: http://localhost:9870
- Spark Master UI: http://localhost:8080
- Spark Worker UI: http://localhost:8081

---

## Prerequisites

- Docker Desktop (or Docker Engine) and Docker Compose
- Java 8+ and Maven (only if you want to build the JAR locally; otherwise use the provided JAR in `app/target/`)

---

## Build the Application (optional if JAR already exists)

From the project root:

```powershell
# Build with Maven (Windows PowerShell)
mvn -f app/pom.xml -DskipTests package
```

This produces `app/target/log-analyzer-1.0-SNAPSHOT.jar`.

---

## Start the Cluster

From the project root:

```powershell
# Start HDFS + Spark services in the background
docker compose up -d

# Check containers
# You should see namenode, datanode, spark-master, spark-worker running
docker compose ps
```

Wait ~20–40 seconds for services to initialize. Then visit the UIs above.

---

## Put Data into HDFS

Your log file exists inside containers at `/data/access.log`. Put it into HDFS under `/logs`:

```powershell
# Create HDFS directory and upload the log file
# (You can run these from either spark-master or namenode. Using spark-master here.)
docker compose exec spark-master hdfs dfs -mkdir -p /logs

docker compose exec spark-master hdfs dfs -put -f /data/access.log /logs/

# Verify the file exists in HDFS
docker compose exec spark-master hdfs dfs -ls /logs
```

If you see `access.log` listed, you’re good to proceed.

---

## Run the Spark Job

The job’s main class is `com.BDS.loganalyzer.LogAnalyzer`. It expects two arguments: `<input-path> <output-path>`.

Recommended: use HDFS for both input and output.

```powershell
# Submit the job to the Spark cluster
docker compose exec spark-master \
  spark-submit \
  --master spark://spark-master:7077 \
  --class com.BDS.loganalyzer.LogAnalyzer \
  /app/target/log-analyzer-1.0-SNAPSHOT.jar \
  hdfs://namenode:9000/logs/access.log \
  hdfs://namenode:9000/output/log-analyzer
```

View results in HDFS:

```powershell
# List result directories
docker compose exec spark-master hdfs dfs -ls /output/log-analyzer

# Inspect some JSON outputs (pick a part-* file)
docker compose exec spark-master hdfs dfs -cat /output/log-analyzer/status_counts/part-*

docker compose exec spark-master hdfs dfs -cat /output/log-analyzer/top_urls/part-*

docker compose exec spark-master hdfs dfs -cat /output/log-analyzer/top_ips/part-*
```

If the output path already exists, either delete it or change the output path:

```powershell
# Remove previous outputs (use with care)
docker compose exec spark-master hdfs dfs -rm -r -f /output/log-analyzer
```

---

## Alternative: Run Against Local File (without HDFS input)

If you prefer to read the input directly from the local filesystem inside `spark-master`:

```powershell
# Use file:/// scheme for the input path, keep output on HDFS
docker compose exec spark-master \
  spark-submit \
  --master spark://spark-master:7077 \
  --class com.BDS.loganalyzer.LogAnalyzer \
  /app/target/log-analyzer-1.0-SNAPSHOT.jar \
  file:///data/access.log \
  hdfs://namenode:9000/output/log-analyzer
```

Or write outputs locally as well (mounted at `/data/log_analysis_output`):

```powershell
# Both input and output local to spark-master
docker compose exec spark-master \
  spark-submit \
  --master spark://spark-master:7077 \
  --class com.BDS.loganalyzer.LogAnalyzer \
  /app/target/log-analyzer-1.0-SNAPSHOT.jar \
  file:///data/access.log \
  file:///data/log_analysis_output

# Check local outputs on your host under data/log_analysis_output/
```

---

## What the Job Does (Learning Path)

- `LogAnalyzer.java`
  - Initializes a `SparkSession` and reads the input text file (`Dataset<String>`).
  - Parses each line using a regex for the Apache combined log format.
  - Maps each line to a `LogRecord` bean (see `LogRecord.java`).
  - Filters out non-matching lines.
  - Computes:
    - HTTP status code counts → writes to `<output>/status_counts`
    - Top 10 requested URLs → writes to `<output>/top_urls`
    - Top 10 IP addresses → writes to `<output>/top_ips`
  - Writes outputs as JSON, with `SaveMode.Overwrite`.

- `LogRecord.java`
  - A simple Java bean with fields: `ipAddress`, `timestamp`, `method`, `url`, `statusCode`, `responseSize`.
  - Used with `Encoders.bean(LogRecord.class)` for typed Datasets in Spark.

- `docker-compose.yaml`
  - Defines Hadoop NameNode/DataNode and Spark Master/Worker.
  - Sets `CORE_CONF_fs_defaultFS=hdfs://namenode:9000` so Spark resolves HDFS paths.
  - Mounts `./data` into containers to make `access.log` available for uploading to HDFS.

---

## Troubleshooting

- Path does not exist: `org.apache.spark.sql.AnalysisException: Path does not exist: hdfs://namenode:9000/...`
  - Ensure you uploaded the file to HDFS (`hdfs dfs -ls /logs`).
  - Verify the default FS env var is set on containers (it is in compose).

- Output already exists
  - Remove/rename the output path, or the job may fail or overwrite depending on settings.

- Services not ready
  - Wait a few more seconds; check `docker compose logs namenode` and `spark-master`.

- Parsing issues (empty outputs)
  - Confirm your `access.log` format matches the regex in `LogAnalyzer.java`.

---

## Stop and Clean Up

```powershell
# Stop services
docker compose down

# Optionally remove volumes (this wipes HDFS data)
docker compose down -v
```

---

## References

- Apache Spark: https://spark.apache.org/
- Apache Hadoop (HDFS): https://hadoop.apache.org/
- Docker Compose: https://docs.docker.com/compose/
