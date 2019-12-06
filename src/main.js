var cc = DataStudioApp.createCommunityConnector();

var getRequestOptions = {
  method: "get",
  contentType: "application/json",
  headers: {
    Referer: "GoogleDataStudio",
    Authorization: "Bearer try"
  }
};

var getFieldsRequestUrl = "https://dev.ranksonic.com/ranking/getFields";

var getProjectsRequest = "https://dev.ranksonic.com/common/projects_ajax_ng";

var getDataRequestUrl =
  "https://dev.ranksonic.com/ranking/getVisualizationData";

// https://developers.google.com/datastudio/connector/reference#isadminuser
function isAdminUser() {
  return false;
}

function loadProjectsData() {
  var projects_array = [];
  var userProperties = PropertiesService.getUserProperties();
  var jwtToken = userProperties.getProperty(JWT_TOKEN_PATH);

  if (jwtToken) {
    //console.log("Use token from store");
    getRequestOptions.headers.Authorization = "Bearer " + jwtToken;
  }
  var requestResponse = UrlFetchApp.fetch(
    getProjectsRequest,
    getRequestOptions
  );
  if (requestResponse.getResponseCode() === 200) {
    projects_array = JSON.parse(requestResponse.getContentText()).projects;
  }
  return projects_array;
}

// https://developers.google.com/datastudio/connector/reference#getconfig
function getConfig(request) {
  var config = cc.getConfig();

  config
    .newInfo()
    .setId("generalInfo")
    .setText("Enter Required Credential");

  var projects_array = loadProjectsData();

  var projects_selector = config
    .newSelectSingle()
    .setId("projectId")
    .setName("Select project")
    .setHelpText("Please select project for report")
    .setIsDynamic(true);
  if (projects_array && projects_array.length > 0) {
    projects_array.forEach(function(project) {
      projects_selector.addOption(
        config
          .newOptionBuilder()
          .setLabel(project.name)
          .setValue(project.id)
      );
    });
  }

  if (request && request.configParams && request.configParams.projectId) {
    var se_selector = config
      .newSelectSingle()
      .setId("seId")
      .setName("Select SE")
      .setHelpText("Please select SE for report")
      .setIsDynamic(true);
    var project = projects_array.filter(function(project) {
      return +project.id === +request.configParams.projectId;
    })[0];
    if (project && project.ses.length > 0) {
      project.ses.forEach(function(se) {
        se_selector.addOption(
          config
            .newOptionBuilder()
            .setLabel(se.label)
            .setValue(se.value)
        );
      });
    }
  }

  if (request && request.configParams && !request.configParams.projectId) {
    config.setIsSteppedConfig(true);
  }

  config.setDateRangeRequired(true);

  return config.build();
}

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;

  var userProperties = PropertiesService.getUserProperties();
  var jwtToken = userProperties.getProperty(JWT_TOKEN_PATH);

  if (jwtToken) {
    //console.log("Use token from store");
    getRequestOptions.headers.Authorization = "Bearer " + jwtToken;
  }

  var requestResponse = UrlFetchApp.fetch(
    getFieldsRequestUrl,
    getRequestOptions
  );
  if (requestResponse.getResponseCode() === 200) {
    requestResponse = JSON.parse(requestResponse.getContentText());
  }

  //console.log(requestResponse.fields);
  requestResponse.fields.forEach(function(item) {
    fields
      .newMetric()
      .setId(item.name)
      .setName(item.title)
      .setType(types[item.type]);
  });
  return fields;
}

// https://developers.google.com/datastudio/connector/reference#getschema
function getSchema(request) {
  //console.log(request);
  /**
   * @example {configParams={userStudioTocken=Gorilka911, userEmail=oleg.odnoral@rankactive.com, projectId=2826}}
   */
  return { schema: getFields().build() };
}

// https://developers.google.com/datastudio/connector/reference#getdata

/**
 * @param {{name: string}[]} fieldsArray
 * @example [{"name":"RankDate"},{"name":"RankQ1"},{"name":"RankQ10"}]
 */
function transformFieldsArrayToGetParams(fieldsArray) {
  var res = fieldsArray
    .map(function(item, index) {
      return Object.keys(item)
        .map(function(key) {
          return (
            encodeURIComponent(key + "[" + index + "]") +
            "=" +
            encodeURIComponent(item[key])
          );
        })
        .join("&");
    })
    .join("&");
  res = "?" + res;
  return res;
}

/**
 * Load data for visualization
 * @param {*} request
 * @example {configParams={projectId=2826, seName=google.com}, scriptParams={lastRefresh=1575468647058}, fields=[{name=RankDate}, {name=RankQ1}]}
 */
function getData(request) {
  //console.log(request);
  if (!request) {
    request = {
      configParams: { projectId: "2826", seName: "google.com" },
      scriptParams: { lastRefresh: 1575468647058 },
      fields: [{ name: "RankDate" }, { name: "RankQ1" }]
    };
  }

  var localRequestUrl = getDataRequestUrl;
  if (request && request.configParams && request.configParams.projectId) {
    localRequestUrl =
      localRequestUrl + "?project_id=" + request.configParams.projectId;
    if (request.configParams.seId) {
      localRequestUrl = localRequestUrl + "&se_id=" + request.configParams.seId;
    }
    if (request.dateRange && request.dateRange.startDate && request.dateRange.endDate) {
      localRequestUrl = localRequestUrl + "&startDate=" + request.dateRange.startDate;
      localRequestUrl = localRequestUrl + "&endDate=" + request.dateRange.endDate;
    }
  }

  var userProperties = PropertiesService.getUserProperties();
  var jwtToken = userProperties.getProperty(JWT_TOKEN_PATH);

  if (jwtToken) {
    //console.log("Use token from store");
    getRequestOptions.headers.Authorization = "Bearer " + jwtToken;
  }

  var requestResponse = UrlFetchApp.fetch(localRequestUrl, getRequestOptions);
  if (requestResponse.getResponseCode() === 200) {
    requestResponse = JSON.parse(requestResponse.getContentText());
  }

  var requestedFields = getFields().forIds(
    request.fields.map(function(field) {
      return field.name;
    })
  );

  var rows = [];
  requestResponse.data_for_fields.forEach(function(item) {
    var row = [];
    requestedFields.asArray().forEach(function(field) {
      if (!item[field.getId()]) {
        console.log("Can`t find: " + field.getId());
        console.log("In :", item);
      }
      row.push(item[field.getId()]);
    });
    if (row.length < request.fields.length) {
      console.log("ROW Length error", row);
    }
    rows.push({ values: row });
  });

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}
