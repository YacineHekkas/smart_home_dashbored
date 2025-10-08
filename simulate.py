# simulate.py (updated)
import time
import json
import random
import argparse
import paho.mqtt.client as mqtt
import socket

parser = argparse.ArgumentParser()
parser.add_argument("--broker", default="localhost")
parser.add_argument("--port", type=int, default=1883)
parser.add_argument("--devices", type=int, default=5)
parser.add_argument("--interval", type=float, default=2.0)
parser.add_argument("--retry", type=int, default=5)
args = parser.parse_args()

client = mqtt.Client(protocol=mqtt.MQTTv311)

def try_connect():
    while True:
        try:
            client.connect(args.broker, args.port, 60)
            print(f"Connected to MQTT broker {args.broker}:{args.port}")
            return
        except Exception as e:
            print(f"Could not connect to {args.broker}:{args.port} -> {e}")
            print(f"Retrying in {args.retry}s ... (Ctrl+C to stop)")
            time.sleep(args.retry)

try_connect()
client.loop_start()

def gen_payload(device_id):
    return {
        "temp": round(20 + random.uniform(-5, 5), 2),
        "pressure": round(101.3 + random.uniform(-0.5, 0.5), 2),
        "status": random.choice(["OK", "WARN", "FAIL"])
    }

try:
    print(f"Simulating {args.devices} devices sending every {args.interval}s to {args.broker}:{args.port}")
    while True:
        for i in range(1, args.devices + 1):
            topic = f"sim/device/{i}/telemetry"
            payload = gen_payload(i)
            rc = client.publish(topic, json.dumps(payload)).rc
            print(f"PUB -> {topic} {payload} rc={rc}")
        time.sleep(args.interval)
except KeyboardInterrupt:
    print("Stopped by user")
finally:
    client.loop_stop()
    try:
        client.disconnect()
    except:
        pass
