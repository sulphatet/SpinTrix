let coarse_graph_data;
let center_positions_spiral;
let link_data;
let node_to_node_link_data;

// Tracks which timeslice is currently loaded
window.currentYearRange = null;



//for community size barchart
function showdata_count(data){
  //transform data
  data = data.map(d=> ({
    x : d.community,
    y : parseFloat(d.count)
  }))
  var svg = d3.select("#barchart-no_of_nodes")
  initializeChart(svg),
  draw(data, "Community", "Number_of_nodes", "Number of nodes in each community");
}

//for density barchart
function showdata_density(data){
  //transform data
  data = data.map(d=> ({
    x : d.community,
    y : parseFloat(d.density)
  }))
  var svg = d3.select("#barchart-density")
  initializeChart(svg),
  draw(data, "Community", "Density", "Density of edges in each community");
}

//for max degree barchart
function showdata_hdegree(data){
  //transform data
  data = data.map(d=> ({
    x : d.community,
    y : +d.h_degree
  }))
  var svg = d3.select("#barchart-h_degree")
  initializeChart(svg),
  draw(data, "Community", "Max-Degree", "Max-Degree in each community");
}

//for connection heatmap
function showdata_connectivity_heatmap(data){
  //transform data
  data = data.map(d=> ({
    source : d.source,
    target : d.target,
    weight : +d.weight
  }))
  //theData = data;
  var svg = d3.select("#heatmap-connectivity")
  initializeChart(svg),
  draw_heatmap(data, "Community", "Community", "Community to community connections");
}

function  show_table_data(data){
  // Get every column value
  var columns = Object.keys(data[0])
  .filter(function(d){
    return ((d != "x" && d != "y" && d != "new_x" && d != "new_y"));
  });

  var header = thead.append("tr")
      .selectAll("th")
      .data(columns)
      .enter()
      .append("th")
          .text(function(d){ return d;})
          .on("click", function(d, da){
              rows.sort(function(a, b){
                  return b[da] - a[da];
              })

            });

  var rows = tbody.selectAll("tr")
      .data(data)
      .enter()
      .append("tr")
      .on("mouseover", function(d){
        if (d3.select(this).style("background-color")== "blue")
          d3.select(this)
            .style("background-color", "blue")
        else
          d3.select(this)
              .style("background-color", "orange");
      })
      .on("mouseout", function(d){
        if (d3.select(this).style("background-color")== "blue")
         d3.select(this)
          .style("background-color", "blue")
        else
          d3.select(this)
              .style("background-color","transparent");
      });



  var cells = rows.selectAll("td")
      .data(function(row){
          return columns.map(function(d, i){

              return {i: d, value: row[d]};
          });
      })
      .enter()
      .append("td")
      .html(function(d){ return d.value;});

  //highlight the find_node_data if present
  d3.selectAll("tr").style("background-color", function(d,i){
    if (d!== undefined)
      {
        if (d.node == find_node_id)
        { console.log(d.node, find_node_id)
          return "blue";}

      }})
  }


  function showdata_spiral_community_chart(data){

    //define height and width of svg
    //let width = 700,
    //height = 700;
  
      //assign height and width of svg
      let svg = d3.select("#chart")
      let bounds = svg.node().getBoundingClientRect()
      let width = bounds.width
      let height = bounds.height
      console.log(width, height)
      initializeSpiralChart(svg, height, width)
  
    //coarse_graph_data
      coarse_graph_data = data[6]
      center_positions_spiral = string_to_numbers_graph_centers(coarse_graph_data)
      console.log(center_positions_spiral)
    //transforming the coordinates
      center_positions_spiral=transform_graph_centers(center_positions_spiral, height, width)
      center_positions_spiral.sort(function(a,b){return d3.ascending(a.community, b.community)})
      console.log(center_positions_spiral)
      //transform_link data
      link_data = transform_link_data(data[2])
      //connections list
      connections_list = data[4]
      extent_of_centralities_after_removing_outliers = data[5]
      //console.log(connections_list)
      optimal_no_of_nodes = opt_no_of_nodes(data[6]) //added by bhanu
      
      node_to_node_link_data = transform_node_to_node_link_data(data[3])
      console.log(node_to_node_link_data)
      
    //transform data from strings to integers
      data = transform_data(data[0])
      console.log(data)
  
    //calculate final x and y position for each point
      data = computing_spiral_positions(center_positions_spiral, data, height, width)
      // added one more variable optimal_no_of_nodes by bhanu in computing_spiral_positions function
      console.log(data)
      global_data = data //changes with interactions
      global_data_unchanged = data
      global_data_sorted = data
      global_data_sorted.sort(function(a,b){return d3.descending(a.node, b.node)})
      console.log(global_data_sorted)
      global_data = global_data_sorted
  
      let prepare_data = []
      unique_communities = new Set(global_data_unchanged.map(function(d){return d.community}))
      console.log("updated_version_degree")
      unique_communities.forEach(function(entry) {
        community_data = global_data_unchanged.filter(function(d){ return d.community == entry});
        community_data.sort(function(a,b){return d3.descending(a.centrality,b.centrality)})
        prepare_data.push.apply(prepare_data,community_data)
      })
      console.log(prepare_data)
  
      prepare_data = computing_spiral_positions(center_positions_spiral, prepare_data, height, width)
      global_data = prepare_data
      global_data_unchanged = prepare_data
      console.log(global_data)
  
    
  
    draw_spiral_community()
   
  }
  

/*function isSelected(brush_coords, cx, cy) {

  var x0 = brush_coords[0][0],
      x1 = brush_coords[1][0],
      y0 = brush_coords[0][1],
      y1 = brush_coords[1][1];

 return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}
*/




// START!
//d3.select("#barchart_count").on("resize", draw)

//window.addEventListener("resize", draw);

// Hardcoded array of year directories
const years = ["2000-2004", "2005-2009", "2010-2014", "2015-2019"];

let allYearsNodeData = {};
let allYearsNodeLinks = {};

function loadAllYearsData() {
  let promises = [];

  years.forEach(yearRange => {
    // For each timeslice, read the facebook_data_transformed_new.csv
    let p1 = d3.csv(`data/${yearRange}/facebook_data_transformed_new.csv`).then(csvData => {
      // We'll transform it into a dictionary of { nodeID -> rowData }
      let dictForTimeslice = {};
      csvData.forEach(row => {
        let nodeID = +row.node;       // ensure numeric
        let nodeType = row.type;      // "incoming", "outgoing", "outandin", etc.
        let centrality = +row.centrality; // or edges formed

        dictForTimeslice[nodeID] = {
          centrality: centrality,
          type: nodeType
        };
      });

      // Store in global object
      allYearsNodeData[yearRange] = dictForTimeslice;
    });

    let p2 = d3.csv(`data/${yearRange}/node_to_node_link_data.csv`)
             .then(edges => {
                // convert to numeric
                edges.forEach(e => {
                  e.source = +e.source;
                  e.target = +e.target;
                  // e.type is e.type
                });
                allYearsNodeLinks[yearRange] = edges; // store in global
             });

  promises.push(p1, p2);
  });

  // Return a single promise that resolves when all timeslices are loaded
  return Promise.all(promises);
}

function clearCharts() {
  // Remove or clear all svg elements from previous charts
  d3.select("#barchart-no_of_nodes").selectAll("*").remove();
  d3.select("#heatmap-connectivity").selectAll("*").remove();
  d3.select("#barchart-h_degree").selectAll("*").remove();
  d3.select("#barchart-density").selectAll("*").remove();
  d3.select("#chart").selectAll("*").remove();
  d3.select("#community_spiral").selectAll("*").remove();
  d3.select("#community_textbox").selectAll("*").remove();
  d3.select("#node_textbox").selectAll("*").remove();
  d3.select("#community_histogram").selectAll("*").remove();
  d3.select("#table-location").selectAll("*").remove();
}

// Create buttons for each year directory
const buttonContainer = d3.select("#year-buttons");

buttonContainer.selectAll("button")
  .data(years)
  .enter()
  .append("button")
  .text(d => d)
  .on("click", function(event, d) {
    // Remove active class from all buttons
    buttonContainer.selectAll("button").classed("active", false);
    // Add active class to the clicked button
    d3.select(this).classed("active", true);
    
    window.currentYearRange = d;
    loadAllYearsData().then(() => {
      loadData(d);  // Load data for the selected year
    });
  });




// A function that loads all data and updates the visualization for a given year
function loadData(year) {
  // Clear existing charts if necessary
  clearCharts();

  var table = d3.select("#table-location")
  
    .append("table")
    .attr("class", "table table-condensed table-striped");
  table.append("thead");
  table.append("tbody");
  
  // Update additional charts
  // d3.csv(`data/${year}/commuity_count.csv`).then(showdata_count);
  // d3.csv(`data/${year}/commuity_density.csv`).then(showdata_density);
  // d3.csv(`data/${year}/commuity_h_degree.csv`).then(showdata_hdegree);
  // d3.csv(`data/${year}/heatmap_data.csv`).then(showdata_connectivity_heatmap);
  // d3.csv(`data/${year}/facebook_data_transformed_new.csv`).then(show_table_data);

  // Load the main spiral community chart data.
  Promise.all([
    d3.csv(`data/${year}/facebook_data_transformed_new.csv`), // centrality data
    d3.csv(`data/${year}/coarse_graph_pos.csv`),
    d3.csv(`data/${year}/link_data.csv`),
    d3.csv(`data/${year}/node_to_node_link_data.csv`),
    d3.json(`data/${year}/connection_list.json`),
    d3.json(`data/${year}/new_extent_without_outliers_for_colorcoding.json`),
    d3.csv(`data/${year}/commuity_count.csv`)
  ])
  .then(function(data) {
    // This function is called only after all the files are loaded.
    showdata_spiral_community_chart(data);
    
    // Now that global_data (and other globals) have been updated,
    // update the side widget if a community is currently highlighted.
    // if (highlightNodes.length > 0) {
      updateCommunitySpiralSideWidget();
    // }
  })
  .catch(function(error) {
    console.error("Error loading data:", error);
  });
}
