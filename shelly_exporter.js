let CONFIG = {
  component: "switch",
  id: 0,
  bucket: [1, 2, 5, 10, 20, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550]
};

let STORE = {
  status: {},
  energy: {
    bucket: [],
    count: 0,
    sum: 0.0
  }
};

for (let i = 0; i < CONFIG.bucket.length; i++) {
  STORE.energy.bucket.push(0);
}

STORE.status = Shelly.getComponentStatus(CONFIG.component, CONFIG.id);
Shelly.addStatusHandler(function (status_data) {
  if (status_data.delta !== undefined && status_data.name === CONFIG.component && status_data.id === CONFIG.id) {
    for (let prop in status_data.delta) {
      STORE.status[prop] = status_data.delta[prop];
    }
    if (status_data.delta.aenergy !== undefined) {
      let wattHour = status_data.delta.aenergy.by_minute[0] / 1000.0;
      STORE.energy.count += 1;
      STORE.energy.sum += wattHour;
      let watt = wattHour * 60.0;
      for (let i = 0; i < CONFIG.bucket.length; i++) {
        let key = CONFIG.bucket[i];
        if (watt <= key) {
          STORE.energy.bucket[i] = STORE.energy.bucket[i] + 1;
        }
      }
    }
  }
});

function shelly_exporter_body() {
  let body = "# HELP shelly_apower Last measured instantaneous active power (in Watts) delivered to the attached load\n"
    + "# TYPE shelly_apower gauge\n"
    + "shelly_apower " + JSON.stringify(STORE.status.apower) + "\n"
    + "\n"
    + "# HELP shelly_voltage Last measured voltage in Volts\n"
    + "# TYPE shelly_voltage gauge\n"
    + "shelly_voltage " + JSON.stringify(STORE.status.voltage) + "\n"
    + "\n"
    + "# HELP shelly_current Last measured current in Amperes\n"
    + "# TYPE shelly_current gauge\n"
    + "shelly_current " + JSON.stringify(STORE.status.current) + "\n"
    + "\n"
    + "# HELP shelly_energy Information about the active energy counter\n"
    + "# TYPE shelly_energy histogram\n";
  for (let i = 0; i < CONFIG.bucket.length; i++) {
    let key = CONFIG.bucket[i];
    body += "shelly_energy_bucket{le=" + JSON.stringify(key) + "} " + JSON.stringify(STORE.energy.bucket[i]) + " " + JSON.stringify(STORE.status.aenergy.minute_ts) + "000\n";
  }
  
  body += "shelly_energy_bucket{le=\"+Inf\"} " + JSON.stringify(STORE.energy.count) + " " + JSON.stringify(STORE.status.aenergy.minute_ts) + "000\n"
    + "shelly_energy_count " + JSON.stringify(STORE.energy.count) + " " + JSON.stringify(STORE.status.aenergy.minute_ts) + "000\n"
    + "shelly_energy_sum " + JSON.stringify(STORE.energy.sum) + " " + JSON.stringify(STORE.status.aenergy.minute_ts) + "000";

  body += "\n\n"
    + "#DEBUG: " + JSON.stringify(STORE);

  return body;
}

HTTPServer.registerEndpoint("metrics", function (request, response) {
  response.body = shelly_exporter_body();
  response.code = 200;
  response.send();
});