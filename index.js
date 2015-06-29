var express = require('express'),
  nconf = require('nconf'),
  lazy = require("lazy"),
  childProcess = require('child_process'),
  app = express();

nconf.argv().env();
nconf.file("./config.json");
nconf.load();

var stripWindowsServiceCLILine = function (ioLine) {
  ioLine = ioLine.trim();
  switch (ioLine) {
    case "These Windows services are started:":
    case "The command completed successfully.": return "";
    default: return ioLine;
  }
};

var getServices = function (filter, callback) {
  var child = childProcess.spawn("net", ['start']);
  var errData = '';
  var services = [];
  child.stderr.on('data', function (chunk){
    errData += chunk;
  });
  child.on('exit', function () {
    if (errData) {
      console.log(errData);
      return callback(errData, []);
    }

    callback(undefined, services);
  });

  lazy(child.stdout)
    .lines
    .map(String)
    .skip(2)
    .map(stripWindowsServiceCLILine)
    .filter(function (service){
      if (filter) {
        return service && service.toLowerCase() === filter.toLowerCase()
      }
      else {
        //Ensure service isn't blank
        return service; 
      }
    })
    .forEach(function(service){
      services.push(service);
    });
};

app.get('/info/:service', function (req, res) {
  var host = server.address().address;
  if (host === '::') {
    host = "localhost";
  }
  var port = server.address().port;

  res.json({
    "description": "Windows Service is monitored by a REST API - https://github.com/thealah/rest-windows-service-health-fascade",
    "windowsService": req.params.service,
    "serverHost": host,
    "serverPort": port,
    "ui": {
      "hide": ["serverHost", "serverPort"]
    }
  });
  res.end();
});

app.get('/:service', function (req, res) {
  var serviceFilter = req.params.service;
  if (!serviceFilter) {
    response.badRequest(res, "Invalid Service Name");
    return;
  }

  getServices(serviceFilter, function (err, services) {
    if (err) {
      res.status(500).json({
        "type": "Windows Service",
        "message": "Error reading Windows Services",
        "ui": {
          "info": "/info/" + encodeURIComponent(serviceFilter)
        }
      });
    }
    else if (!services.length) {
      res.status(502).json({
        "type": "Windows Service",
        "message": "Missing Windows Service '" + serviceFilter + "' or it is stopped",
        "ui": {
          "info": "/info/" + encodeURIComponent(serviceFilter)
        }
      });
    }
    else {
      res.json({
        "type": "Windows Service",
        "ui": {
          "info": "/info/" + encodeURIComponent(services[0])
        }
      });
    }
    res.end();
  });
});

app.get('/', function (req, res) {
  getServices(undefined, function (err, services) {
    if (err) {
      res.status(500);
    }
    else {
      res.json({
        "services": services,
        "message": "To use the healthcheck portion of the API, use the route: /$WINDOWS_SERVICE_NAME"
      }); 
    }
    res.end();
  });
});

var server = app.listen(nconf.get('port') || 3000, function () {
  var host = server.address().address;
  if (host === '::') {
    host = "localhost";
  }
  var port = server.address().port;

  console.log('Windows Service HealthCheck REST API listening at http://%s:%s', host, port);
});

if (nconf.get('alternatePort')) {
  var alternateServer = app.listen(nconf.get('alternatePort') || 3000, function () {
    var host = alternateServer.address().address;
    if (host === '::') {
      host = "localhost";
    }
    var port = alternateServer.address().port;

    console.log('Windows Service HealthCheck REST API listening at http://%s:%s', host, port);
  });
}