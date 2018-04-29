/* By Jessica Kane, 2018 */
/* Responsive Table code modified from bl.ocks.org and carries the same license (http://bl.ocks.org/AMDS/4a61497182b8fcb05906) */

//begin script when window loads
window.onload = setMap();

//set up map
function setMap(){
    
    //map frame dimensions
    var width = 750,
        height = 480;
    
    //create new svg container for the map
    var mapContainer = d3.select("#container")
        .append("div")
        .attr("id", "map-container");

    //create new svg container for the map
    var map = d3.select("#map-container")
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("class", "map");
    
    //Make map responsive to changing screen size
    var mapSelect = $(".map");
    var aspect = mapSelect.width() / mapSelect.height(),
        container = mapSelect.parent();
    $(window).on("resize", function() {
        var targetWidth = container.width();
        mapSelect.attr("width", targetWidth);
        mapSelect.attr("height", Math.round(targetWidth / aspect));
    }).trigger("resize");

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([-127.64, 39.05])
        .rotate([26.45, 63.64, 0])
        .parallels([43.14, 46.48])
        .scale(4000)
        .translate([width / 2, height / 2]);
    
    var path = d3.geoPath()
        .projection(projection);
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/MNFICountyElementData.csv") //load attributes from csv
        .defer(d3.json, "data/MICounties.topojson") //load spatial data
        .await(callback);
    
    function callback(error, csvData, counties){
        
        //translate countie TopoJSON
        var MIcounties = topojson.feature(counties, counties.objects.MICounties).features;

        //add France regions to map
        var counties = map.selectAll(".counties")
            .data(MIcounties)
            .enter()
            .append("path")
            .attr("class", "counties")
            .attr("id", function(d){
                var name = d.properties.NAME;
                name = name.replace(/\./g, "")
                var id = name.replace(/\s+/g, '-');
                return id;
            })
            .attr("d", path);
        
        var labels = map.selectAll(".labels")
            .data(MIcounties)
            .enter()
            .append("text")
            .attr("class", "labels")
            .attr("text-anchor", "middle")
            .attr("x", function(d) {
                return path.centroid(d)[0];
            })
            .attr("y", function(d) {
                return path.centroid(d)[1];
            })
            .text(function(d){
                return d.properties.NAME;
            });
        
        $('select[name="mainDropdown"]').change(function(){
            var selection = $(this).val();
            if (selection == "viewBySpecies") {
                viewBySpecies(csvData, counties);
            } else {
                viewByCounty(csvData, counties);
            };
        });
        //setData(csvData, counties);
    };
};

function viewByCounty(csvData, counties){
    
    $('#selection-area').empty();
    $('#last-dropdown-area').empty();
    $('.counties').css('fill', 'gray');
    
    $("#selection-area").append('<p class="instructions"><em> Click on a county to view a list of threatened/endangered species found there.</em></p>')
    
    $(".counties").click(function() {
        var countyId = $(this).attr("id");
        var countyName = countyId.replace(/-/g, ' ');
        
        $('.counties').css('fill', 'gray');
        $('#' + countyId).css('fill', 'black');
        $('#county-title').remove();
        $("#selection-area").append('<h3 id="county-title">' + countyName + ' County</h3>')
        createTable(countyId, csvData, counties);
    });
    
};

function createTable(countyId, csvData, counties){
    
    $('#county-table').remove();
    
    var columnsRemoved =
        csvData.map(function(d){
            return {
                'County': d.County,
                'Scientific Name': d.SCIENTIFIC_NAME,
                'Common Name': d.COMMON_NAME,
                'Category': d.EL_CATEGORY,
                'State Status': d.STATE_STATUS,
                'US Status': d.US_STATUS
            }
        })
    
    var filteredData =
        columnsRemoved.filter(function(d) {
            var county = d.County;
            county = county.replace(/\./g, "")
            var id = county.replace(/\s+/g, '-');
            return id == countyId;
        });
    
    //d3.csv("data.csv", function(error, data) {
//		  if (error) throw error;
		  
		  var sortAscending = true;
		  var table = d3.select('#selection-area')
            .append('table')
            .attr("id", "county-table");
		  var titles = d3.keys(columnsRemoved[0]);
		  var headers = table.append('thead').append('tr')
		                   .selectAll('th')
		                   .data(titles).enter()
		                   .append('th')
		                   .text(function (d) {
			                    return d;
		                    })
		                   .on('click', function (d) {
		                	   headers.attr('class', 'header');
		                	   
		                	   if (sortAscending) {
		                	     rows.sort(function(a, b) { return b[d] < a[d]; });
		                	     sortAscending = false;
		                	     this.className = 'aes';
		                	   } else {
		                		 rows.sort(function(a, b) { return b[d] > a[d]; });
		                		 sortAscending = true;
		                		 this.className = 'des';
		                	   }
		                	   
		                   });
		  
		  var rows = table.append('tbody').selectAll('tr')
		               .data(filteredData).enter()
		               .append('tr');
		  rows.selectAll('td')
		    .data(function (d) {
		    	return titles.map(function (k) {
		    		return { 'value': d[k], 'name': k};
		    	});
		    }).enter()
		    .append('td')
		    .attr('data-th', function (d) {
		    	return d.name;
		    })
		    .text(function (d) {
		    	return d.value;
		    });
	  //});
    
};

function viewBySpecies(csvData, counties){
    
    $('#selection-area').empty();
    
    $("#selection-area").append('<p class="instructions"><em> Select a category, then species to view the counties where that species is present on the map.</em></p>')
    
    $('.counties').css('fill', 'gray');
    $('.counties').off('click');
    
    //Add dropdown
    $("#selection-area").append('<br><select name="categoryDropdown" id="animalOrPlantSelect" size=1>');
    
    //Set CSS for dropdown
    //$('#animalOrPlantSelect').css("font-family", "'Hind Madurai', sans-serif");
    //$('#animalOrPlantSelect').css("font-size", "1.1em");
    
    //Add options to dropdown
    $('#animalOrPlantSelect').append($('<option value="" disabled selected>Select Category</option>'));
    $('#animalOrPlantSelect').append($('<option>', {
        value: 'animal',
        text: 'Animal'
    }));
    $('#animalOrPlantSelect').append($('<option>', {
        value: 'plant',
        text: 'Plant'
    }));
    
    $('select[name="categoryDropdown"]').change(function(){
        var selection = $(this).val();
        if (selection == "animal") {
            var category = 'Animal';
            
            createSpeciesDropdown(csvData, category);
            
        } else if (selection == "plant"){
            var category = 'Plant';
            
            //$('#last-dropdown-area').empty();
            
            //$("#last-dropdown-area").append('<br><select //name="plantDropdown" id="plantSelect" size=1>');
            
            //$('#plantSelect').append($('<option value="" disabled //selected>Select Plant</option>'));
            
            createSpeciesDropdown(csvData, category);
            
        };
    });
    
};

function createSpeciesDropdown(csvData, category){
    $('#last-dropdown-area').empty();
            
    $("#last-dropdown-area").append('<br><select name="speciesDropdown" id="speciesSelect" size=1>');

    $('#speciesSelect').append($('<option value="" disabled selected>Select Species</option>'));
    
    var filteredCategory =
        csvData.filter(function(d) {
            return d.EL_CATEGORY == category;
        });

    var options = d3.select("#speciesSelect").selectAll("option")
        .data(d3.map(filteredCategory, function(d){return d.COMMON_NAME;}).keys())
        .enter()
        .append("option")
        .text(function(d){return d;})
        .attr("value",function(d){return d;})
        .sort(function(a, b) {
            return d3.ascending(a, b)
        });
    
    $('select[name="speciesDropdown"]').change(function(){
        $('.counties').css('fill', 'gray');
        
        var speciesID = $(this).val();
        
        var countyList = [];
        
        for (row in csvData) {
            if (csvData[row].COMMON_NAME == speciesID) {
                countyList.push(csvData[row].County);
            }
        };
        
        for (county in countyList) {
            var county = countyList[county];
            county = county.replace(/\./g, "")
            id = county.replace(/\s+/g, '-');
        
            $('#' + id).css('fill', 'red');
            
        }
        
    });
    
};