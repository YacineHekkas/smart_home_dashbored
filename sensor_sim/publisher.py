import os, time, json, random
import paho.mqtt.client as mqtt

MQTT_HOST = os.environ.get('MQTT_HOST', 'localhost')
MQTT_PORT = int(os.environ.get('MQTT_PORT', 1883))

client = mqtt.Client()
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

def publish_sensor(device_id, payload):
    topic = f"home/{device_id}/state"
    client.publish(topic, json.dumps(payload))
    print("Published", topic, payload)

try:
    while True:
        # temperature sensor
        t = round(20 + random.random()*6, 2)
        publish_sensor('sensor1', {'type':'temperature','value':t})
        # light device (on/off state)
        state = random.choice(['on','off'])
        publish_sensor('light1', {'type':'light','state':state})
        time.sleep(5)
except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
