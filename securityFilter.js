var nconf = require('nconf'),
  path = require('path');

nconf.argv().env();
nconf.file(path.join(__dirname, "config.json"));
nconf.load();

var filters = {
  "services": {
    "whiteListRegex": nconf.get("filter:services:whitelist:regex") ? new RegExp(nconf.get("filter:services:whitelist:regex")) : undefined,
    "whiteListNames": nconf.get("filter:services:whitelist:names"),
    "blackListRegex": nconf.get("filter:services:blacklist:regex") ? new RegExp(nconf.get("filter:services:blacklist:regex")) : undefined,
    "blackListNames": nconf.get("filter:services:blacklist:names")
  },
  "websites": {
    "whiteListRegex": nconf.get("filter:websites:whitelist:regex") ? new RegExp(nconf.get("filter:websites:whitelist:regex")) : undefined,
    "whiteListNames": nconf.get("filter:websites:whitelist:names"),
    "blackListRegex": nconf.get("filter:websites:blacklist:regex") ? new RegExp(nconf.get("filter:websites:blacklist:regex")) : undefined,
    "blackListNames": nconf.get("filter:websites:blacklist:names")
  }
};

var checkList = function (name, isService, isExcluded) {
  var regex, nameList, type;
  if (isService) {
    type = filters.services;
  }
  else {
    type = filters.websites;
  }

  if (isExcluded) {
    regex = type.blackListRegex;
    nameList = type.blackListNames;
  }
  else {
    regex = type.whiteListRegex;
    nameList = type.whiteListNames;
  }

  if (regex) {
    if (regex.test(name)) {
      return !isExcluded;
    }

    //Whitelist failed edgecase
    if (!isExcluded) {
      return false;
    }
  }

  if (nameList && nameList.length) {
    var nameLowered = name.toLowerCase();
    for (var i=0; i<nameList.length; i++) {
      if (nameList[i].toLowerCase() === nameLowered) {
        return !isExcluded;
      }
    }

    //Whitelist failed
    if (!isExcluded) {
      return false;
    }
  }

  return true;
};

var isNotExcluded = function (name, isService) {
  return checkList(name, isService, true);
};

var isWhitelistedOrNoWhiteListDefined = function (name, isService) {
  return checkList(name, isService, false);
};

module.exports = {
  "isServiceAllowed": function (service) {
    var isWhiteListedResult = isWhitelistedOrNoWhiteListDefined(service, true);
    var isNotExcludedResult = isNotExcluded(service, true);
    return isWhiteListedResult && isNotExcludedResult;
  },
  "isWebsiteAllowed": function (website) {
    return isWhitelistedOrNoWhiteListDefined(website, false) && isNotExcluded(website, false);
  }
};