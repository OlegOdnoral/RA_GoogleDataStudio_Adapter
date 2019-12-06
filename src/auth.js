var cc = DataStudioApp.createCommunityConnector();
var USERNAME_PROPERTY_PATH = "dscc.username";
var PASSWORD_PROPERTY_PATH = "dscc.password";
var JWT_TOKEN_PATH = "dscc.JWT";

var postAuthRequestOptions = {
  method: "post",
  headers: {
    Referer: "GoogleDataStudio",
    Authorization: "Bearer try"
  }
};

var postAuthorizationRequestUrl = "https://dev.ranksonic.com/users/loginDataStudio";

// TODO - implement your credentials validation logic here.
function validateCredentials(username, password) {
  if (username && password) {
    postAuthRequestOptions.payload = {
      "login" : username,
      "password" : password
    };
    var requestResponse = UrlFetchApp.fetch(postAuthorizationRequestUrl, postAuthRequestOptions);
    if(requestResponse.getResponseCode() === 200) {
      requestResponse = JSON.parse(requestResponse.getContentText());
      if(requestResponse.token) {
        var userProperties = PropertiesService.getUserProperties();
        userProperties.setProperty(JWT_TOKEN_PATH, requestResponse.token);
        return true
      }
      return false;
    }
    return false;
  }
  return false;
  cc.newDebugError()
    .setText("Implement the validateCredentials() function in ./src/auth.js")
    .throwException();
}

// https://developers.google.com/datastudio/connector/auth#getauthtype
function getAuthType() {
  return cc
    .newAuthTypeResponse()
    .setAuthType(cc.AuthType.USER_PASS)
    .setHelpUrl("https://www.example.org/connector-auth-help")
    .build();
}

// https://developers.google.com/datastudio/connector/auth#isauthvalid
function isAuthValid() {
  var userProperties = PropertiesService.getUserProperties();
  var username = userProperties.getProperty(USERNAME_PROPERTY_PATH);
  var password = userProperties.getProperty(PASSWORD_PROPERTY_PATH);
  //return true;
  return validateCredentials(username, password);
}

// https://developers.google.com/datastudio/connector/auth#setcredentials
function setCredentials(request) {
  var creds = request.userPass;
  var username = creds.username;
  var password = creds.password;

  var validCreds = validateCredentials(username, password);
  if (!validCreds) {
    return false;
    return {
      errorCode: "INVALID_CREDENTIALS"
    };
  }
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(USERNAME_PROPERTY_PATH, username);
  userProperties.setProperty(PASSWORD_PROPERTY_PATH, password);
  return true;
  return {
    errorCode: "NONE"
  };
}

// https://developers.google.com/datastudio/connector/auth#resetauth
function resetAuth() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty(USERNAME_PROPERTY_PATH);
  userProperties.deleteProperty(PASSWORD_PROPERTY_PATH);
}
