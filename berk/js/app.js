require([
  // ArcGIS
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",

  // Widgets
  "esri/widgets/Legend", 
  "esri/widgets/Search",

  // Bootstrap
  "bootstrap/Collapse", 

  // Calcite Maps
  "calcite-maps/calcitemaps-v0.10",
  // Calcite Maps ArcGIS Support
  "calcite-maps/calcitemaps-arcgis-support-v0.10",

  "dojo/domReady!"
], function(Map, MapView, FeatureLayer, Legend, Search, Collapse, CalciteMaps, CalciteMapArcGISSupport) {

  /******************************************************************
   *
   * Create the map, view and widgets
   * 
   ******************************************************************/
  
  const app = {
    center: [-79.95, 33.11],
    scale: 500000,
    basemap: "streets-night-vector",
    viewPadding: {
      top: 50,
      bottom: 0
    },
    uiComponents: ["zoom"],
    mapView: null,
    containerMap: "mapViewDiv",
   
    activeView: null,
    searchWidget: null
  }; 

  const map = new Map({
    basemap: app.basemap
  });

  app.mapView = new MapView({
    container: app.containerMap,
    map: map,
    center: app.center,
    scale: app.scale,
    padding: app.viewPadding,
    ui: {
      components: app.uiComponents
    }
  });
  let projectsList;
  const listContainer = document.getElementById("project-list");

 



  // Search - add to navbar
  var searchWidget = new Search({
    container: "searchWidgetDiv",
    view: app.mapView
  });
  CalciteMapArcGISSupport.setSearchExpandEvents(searchWidget);

 

  // Create the PopupTemplate
  const popupTemplate = { // autocasts as new PopupTemplate()
    title: "Capital Project: {PLANNUMBER}",
    content: [{
      type: "fields",
      fieldInfos: [{
        fieldName: "ProjectName",
        label: "Name",
        format: {
          places: 0,
          digitSeparator: true
        }
      }, {
        fieldName: "FundingSource",
        label: "Funding",
        format: {
          places: 0,
          digitSeparator: true
        }
      }, {
        fieldName: "LocationZip",
        label: "Project Cost"
      }, {
        fieldName: "DESCRIPTION",
        label: "Scope",
        format: {
          places: 0,
          digitSeparator: true
        }
      }, {
        fieldName: "RoadwayStatus",
        label: "Status",
        format: {
          places: 0,
          digitSeparator: true
        }
      }]
    }]
  };

  let filterParams = {
    "RoadwayStatus":"'In Progress'",
    "Workclass": null
  }

  let currdefinitionExpression ="RoadwayStatus = "+ filterParams.RoadwayStatus;


  // Create the FeatureLayer using the popupTemplate
  const bbpointLayer = new FeatureLayer({
    url: "https://gis.berkeleycountysc.gov/arcgis/rest/services/buildingberkeley/buidling_berkeley/MapServer/0",
    outFields: ["*"],
    popupTemplate: popupTemplate,
    definitionExpression: currdefinitionExpression
  });
  map.add(bbpointLayer);    

  const bbpolyLayer = new FeatureLayer({
    url: "https://gis.berkeleycountysc.gov/arcgis/rest/services/buildingberkeley/buidling_berkeley/MapServer/1",
    outFields: ["*"],
    popupTemplate: popupTemplate
  });
  map.add(bbpolyLayer);

  const countyLayer = new FeatureLayer({
    url: "https://gis.berkeleycountysc.gov/arcgis/rest/services/buildingberkeley/buidling_berkeley/MapServer/3"});
  map.add(countyLayer);

  var legend = new Legend({
    view: app.mapView,
    layerInfos: [
      {
        layer: bbpointLayer,
        title: "Project Type"
      }
    ]
  });
  app.mapView.ui.add(legend, "bottom-left");


  let colorCode ={
    "Bridges":"rgba(237,232,83, 0.8)",
    "Dirt To Pave":"rgba(230,80,210, 0.8)",
    "Interchanges":"rgba(194,80,68, 0.8)",
    "Intersection":"rgba(74,145,120, 0.8)",
    "Resurfacing":"rgba(92,247,105, 0.8)",
    "Stormwater":"rgba(0,112,255, 0.8)",
    "Widening":"rgba(230,61,53, 0.8)"
  }

  function updateList(){ 
        listContainer.innerHTML = "";
        //change to jquery?    
        let fragment = document.createDocumentFragment();        
              
        projectsList.forEach(function(result, index) {            
            const attributes = result.attributes;
            const name = attributes.PNAME  
            var uniqueValues = [];
            uniqueValues.push(name);
            uniqueValues.sort();
            uniqueValues.forEach(function (value) {
              // Create a list projects
              const li = document.createElement("li");
              li.classList.add("panel-result");
              li.tabIndex = 0;
              li.setAttribute("data-result-id", index);
                       
             
              li.innerHTML  = value + '<span class="dot" style="background-color:'+colorCode[attributes.Workclass]+'"></span>';
              //li.appendChild('<i class="fa-li fa fa-check-square"></i>')
              
              if(filterParams.Workclass != null){
                if(result.attributes.RoadwayStatus == filterParams.RoadwayStatus.replace(/'/g, "") && result.attributes.Workclass == filterParams.Workclass.replace(/'/g, ""))fragment.appendChild(li);
              }else{
                if(result.attributes.RoadwayStatus == filterParams.RoadwayStatus.replace(/'/g, ""))fragment.appendChild(li);
              }

              
            });

            listContainer.appendChild(fragment);
        });
  }  


  app.mapView.when(function () {

      //check if this returns geometry
      //possible just make a simple json ajax call

        return bbpolyLayer.when(function () {
          var query = bbpolyLayer.createQuery();
          query.orderByFields = ["PNAME"];
          //query.returnGeometry = false;
          return bbpolyLayer.queryFeatures(query);
        });
  }).then(function(results) {  
        
        projectsList = results.features;        
        updateList();
  });


  listContainer.addEventListener("click", onListClickHandler);

  function onListClickHandler(event) {
      const target = event.target;
      const resultId = target.getAttribute("data-result-id");

      // get the graphic corresponding to the clicked zip code
      const result = resultId && projectsList && projectsList[parseInt(resultId,
        10)];
      
      if (result) {
        // open the popup at the centroid of zip code polygon
        // and set the popup's features which will populate popup content and title.

        app.mapView.goTo(result.geometry.extent.expand(1))
          .then(function() {
            app.mapView.popup.open({
              features: [result],
              location: result.geometry.centroid
            });
          });

      }
  }

  const statusElement = document.getElementById("status-filter");
  const statusMapping = {
    "In Progress": "Active",
    "Future Project": "Future",
    "Complete": "Completed"
  }

  function updateFilters(type, val){
      filterParams.RoadwayStatus
      if(val)filterParams[type] = "'" + val +"'";   
      else filterParams[type] = null;
  }
  function getFilterStr(){
      let str = "RoadwayStatus =" + filterParams.RoadwayStatus;
      if(filterParams.Workclass != null){        
        str += "AND Workclass =" +filterParams.Workclass;
      } 
      return str;
  }
    
  statusElement.addEventListener("click", filterByStatus);
  function filterByStatus(event) {
    const selectedStatus = event.target.getAttribute("data-status");
    

    updateFilters("RoadwayStatus", selectedStatus)

    
    currdefinitionExpression = getFilterStr();

    bbpointLayer.definitionExpression = currdefinitionExpression;
    bbpolyLayer.definitionExpression = currdefinitionExpression;

    $("#project-status").text(statusMapping[selectedStatus])
    updateList()
  }

  $(".panel-toggle").click(function(){
    $(".glyphicon-chevron-right").toggleClass("rotate180");
  })




 

  $.get( "https://gis.berkeleycountysc.gov/arcgis/rest/services/buildingberkeley/buidling_berkeley/MapServer/0/query?where=1%3D1&geometryType=esriGeometryEnvelope&outFields=workclass&returnGeometry=false&returnDistinctValues=true&f=json", function( data ) {   
    var obj = JSON.parse(data);
    obj.features.forEach(function(x){    
      $('.workclass-filter').append('<option value="'+x.attributes.Workclass+'">'+x.attributes.Workclass+'</option>');   
    })
  });

  $('.workclass-filter').on('change',function(){    
        updateFilters("Workclass", this.value);
        currdefinitionExpression = getFilterStr();
        bbpointLayer.definitionExpression = currdefinitionExpression;
        bbpolyLayer.definitionExpression = currdefinitionExpression;

        updateList();
  })

  function getUrlParameter(name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  };

  if(getUrlParameter('project')){
    setTimeout(function(){ 
      projectsList.forEach(function(item){
        if(item.attributes.PNAME == getUrlParameter('project')){          
            app.mapView.goTo(item.geometry.extent.expand(1))
            .then(function() {
              app.mapView.popup.open({
                features: [item],
                location: item.geometry.centroid
              });
            });
        }
      })
    }, 2500);
  }
  
    

});
  