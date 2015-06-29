var Service = require("node-windows").Service,
  path = require('path'),
  nconf = require('nconf');

nconf.argv().env();
nconf.file("./config.json");
nconf.load();

var serviceName = nconf.get("serviceName") || "REST Windows Service HealthCheck";
var description = nconf.get("serviceDescription") || "A REST API to discover the Windows Services running a machine for health check purposes.";
var svc = new Service({
  name: serviceName,
  description: description,
  script: path.join(__dirname, "index.js")
});

svc.on("install", function () {
  svc.start();
});


if (nconf.get("install")) {
  svc.install();
}
else if (nconf.get("uninstall")) {
  svc.uninstall();
}
else if (nconf.get("stop")) {
  svc.stop();
}
else if (nconf.get("start")) {
  svc.start();
}