# rest-windows-service-health-facade
A REST endpoint to check on Windows Services and IIS Websites that are running on the machine.

It responds with HTTP GET actions that return a status code and some details for use in a HealthCheck Endpoint UI application (to be covered later)

## Interface

```
/$WINDOWS-SERVICE
```

Health Check on a Windows Service

Examples

* http://localhost:9091/MongoDB
* http://localhost:9091/REST%20Windows%20Service%20HealthCheck
* http://localhost:9091/iis/Default%20Web%20Site

## Setup
```
git clone https://github.com/thealah/rest-windows-service-health-facade.git
npm install
```

### Start the server
`npm start`
### Install as a Windows Service
`node ./windows-service --install`
### Other Windows Service operations
```
node ./windows-service --uninstall
node ./windows-service --start
node ./windows-service --stop
```

## Configuration

Edit the config.json file to edit the server's port, name, and description

```
{
  "serviceName": "REST Windows Service HealthCheck",
  "serviceDescription": "A REST API to discover the Windows Services running on a machine for health check purposes.",
  "port": 9091
}
```
