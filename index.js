var express = require('express'),
  nconf = require('nconf'),
  path = require('path'),
  lazy = require("lazy"),
  childProcess = require('child_process'),
  app = express();

nconf.argv().env();
nconf.file(path.join(__dirname, "config.json"));
nconf.load();

var badRequest = function (res, reason) {
    reason = "The data you sent was invalid. " + (reason || "");
    res.hasEnded = true;
    res.status(500).send(reason).end();
};

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

var stripIisSiteLine = function (ioLine) {
  ioLine = ioLine.trim();
  return ioLine;
};

var getIisWebsites = function (siteFilter, callback) {
  var args = ['list', 'site', '/state:started', '/text:name'];
  if (siteFilter) {
    args.push('/name:' + siteFilter);
  }
  var child = childProcess.spawn(path.join(process.env.systemroot, 'system32', 'inetsrv', 'appcmd.exe'), args);
  var errData = '';
  var websites = [];
  child.stderr.on('data', function (chunk){
    errData += chunk;
  });
  child.on('exit', function () {
    if (errData) {
      console.log(errData);
      return callback(errData, []);
    }

    callback(undefined, websites);
  });

  lazy(child.stdout)
    .lines
    .map(String)
    .map(stripIisSiteLine)
    .forEach(function(website){
      websites.push(website);
    });
};

app.get('/iis/info/:site', function (req, res) {
  var host = server.address().address;
  if (host === '::') {
    host = "localhost";
  }
  var port = server.address().port;

  res.json({
    "description": "IIS Website is monitored by a REST API - https://github.com/thealah/rest-windows-service-health-facade",
    "website": req.params.site,
    "serverHost": host,
    "serverPort": port,
    "ui": {
      "hide": ["serverHost", "serverPort"]
    }
  });
  res.end();
});

app.get('/iis/:site', function (req, res) {
  var siteFilter = req.params.site;
  if (!siteFilter || /^[a-zA-Z0-9- ]+$/.test(siteFilter) == false) {
    badRequest(res, "Invalid Site Name");
    return;
  }

  getIisWebsites(siteFilter, function (err, websites) {
    if (err) {
      res.status(500).json({
        "type": "Website",
        "message": "Error reading IIS Websites",
        "ui": {
          "info": "/iis/info/" + encodeURIComponent(siteFilter)
        }
      });
    }
    else if (!websites.length) {
      res.status(502).json({
        "type": "Website",
        "message": "Missing Website '" + siteFilter + "' or it is stopped",
        "ui": {
          "info": "/iis/info/" + encodeURIComponent(siteFilter)
        }
      });
    }
    else {
      res.json({
        "type": "Website",
        "ui": {
          "info": "/iis/info/" + encodeURIComponent(websites[0])
        }
      });
    }
    res.end();
  });
});

app.get('/iis', function (req, res) {
  getIisWebsites(undefined, function (err, websites) {
    if (err) {
      res.status(500);
    }
    else {
      res.json({
        "services": websites,
        "message": "To use the healthcheck portion of the API, use the route: /iis/$IIS_SITE_NAME"
      }); 
    }
    res.end();
  });
});

app.get('/info/:service', function (req, res) {
  var host = server.address().address;
  if (host === '::') {
    host = "localhost";
  }
  var port = server.address().port;

  res.json({
    "description": "Windows Service is monitored by a REST API - https://github.com/thealah/rest-windows-service-health-facade",
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
    badRequest(res, "Invalid Service Name");
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