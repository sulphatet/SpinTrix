//these variables are used to update the charts based on settings
var global_data;
var global_data_unchanged;
var global_data_sorted;//
let gBrush;
let brush;
let brushFlag = 0;
let densityColFlag = 0;
let degreeColFlag = 0;
let closenessColFlag = 0;
let betweennessColFlag = 0;
let volatilityColFlag = 0;
let eignColFlag = 0;
let global_radius = 2;
let new_data1;
// This will hold up to 3 selected communities from potentially different timeslices
let selectedCommunitySpirals = [];
// Holds the mapping from node ID to its highlight color (e.g., gold, magenta, or green)
let globalHighlightNodesMap = {};


let find_node_id = -1;
//let optimal_no_of_nodes =0;

// NEW GLOBAL VARIABLES for community selection
var selectedCommunity = null;       // holds the currently selected community id
var selectedCommunityNodes = [];    // holds the full node objects from when the community was selected

// NEW GLOBAL VARIABLES to persist the highlighted nodes across timeslices
var highlightNodes = [];            // list of node IDs (numbers) to be highlighted in the main view
var persistentCommunityData = [];   // the full node objects (from the timeslice when clicked)


var flag_most_connected_nodes = 0;
var most_connected_nodes_data;
var connections_list;
var extent_of_centralities_after_removing_outliers;

var activeCommunity =200;

var     idleTimeout,
idleDelay = 350;

var highlight_table_node = -1;

var table = d3.select("#table-location")
	.append("table")
	.attr("class", "table table-condensed table-striped"),
	thead = table.append("thead"),
	tbody = table.append("tbody");

//--- ADDED FOR LOCAL VOLATILITY ---
let localVolatilityColFlag = 1;       // 0 => off, 1 => on
let localVolatilityCenteringFlag = 1; // 0 => off, 1 => reorder outandin->incoming->outgoing->neither

function show_edge_tooltip(source, target, weight){
  //d3.select("#connection_tooltip").html("Community "+ source +" and " +target+ " share "+ weight + " links.")
}

function draw_textbox(data, adjacent_nodes, activeNode, count, deg, bet, clo, eig, node_name) {
  var centrality_data = data.map(function(d){return d.centrality});

  var margin = {top: 10, right: 30, bottom: 30, left: 40},
      width = 250 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

  var inter_community_connections = adjacent_nodes.length - count;

  d3.select("#community_textbox").select("svg").remove();
  d3.select("#node_textbox").html("");

  // Build the list of collaborator names
  let name_of_adjacent_nodes = [];
  for (let i = 0; i < adjacent_nodes.length; i++) {
    let foundObj = data.find(dd => dd.node === adjacent_nodes[i]);
    if (foundObj) {
      name_of_adjacent_nodes.push(foundObj.name);
    } else {
      // Optionally push something else or skip
      // name_of_adjacent_nodes.push("Unknown node " + adjacent_nodes[i]);
    }
  }

  let groupDensity = (data[0]) ? data[0].density : "N/A";
  let groupSize = data.length;

  // append the summary to #community_textbox
  d3.select("#community_textbox")
      .html("<b>Author: </b>"+ node_name +"<br/>"
          +"<b> Collaborator_Count: </b>"+ deg +"<br/><br/>"
          + "<b>Group Information:</b><br/>"
          + "<b>Number of Authors in Group:</b> "+ groupSize + "<br/>"
          + "<b>Edge-density in Group:</b> "+ groupDensity + "<br/><br/>"
          + "<b>Total Collaborators:</b> " + adjacent_nodes.length + "<br/>"
          + "<b>Collaborators within Group:</b> " + count + "<br/>"
          + "<b>Collaborators in other Group:</b> " + inter_community_connections + "<br/>"
          + "<b>List of Collaborators:</b> " + name_of_adjacent_nodes.join(", "))
      .style("font-size", "12px");
}


function draw_histogram(centrality_data, width, height){

  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 40, bottom: 50, left: 50},
      w = 300 - margin.left - margin.right,
      h = 250 - margin.top - margin.bottom;

  d3.select("#community_histogram").select("svg").remove();

  // append the svg object
  var svg = d3.select("#community_histogram")
    .append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // X axis: scale and draw:
    var max = d3.max(centrality_data);
    var min = d3.min(centrality_data);

    var x = d3.scaleLinear()
          .domain([min, max])
          .range([0, w]);

    svg.append("g")
        .attr("transform", "translate(0," + h + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .style("font-size", 14)
        .attr("transform", "rotate(-65)");

    // text label for the x axis
    svg.append("text")
        .attr("x", w/2)
        .attr("y", h + margin.top + 40)
         .style("text-anchor", "middle")
         .attr("dx", "1em")
         .attr("fill", "black")
         .style("font-size", 14)
         .text("Degree-centrality");

    // set the parameters for the histogram
    var histogram = d3.histogram()
        .value(function(d) { return d; })
        .domain(x.domain())
        .thresholds(x.ticks(10));

    // And apply this function to data to get the bins
    var bins = histogram(centrality_data);

    // Y axis: scale and draw:
    var y = d3.scaleLinear()
        .range([h, 0]);
    y.domain([0, d3.max(bins, function(d) { return d.length; })]);

    //label y-axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", 14)
        .call(g => g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (h / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("fill", "black")
        .text("Number of Nodes"));

    // append the bar rectangles
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
          .attr("x", 1)
          .attr("transform", function(d) {
              return "translate(" + x(d.x0) + "," + y(d.length) + ")";
          })
          .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
          .attr("height", function(d) { return h - y(d.length); })
          .style("fill", "teal");
}

// the spiral is drawn in a seperate window on find node functionality
function find_node_draw_spiral(new_data1){

  var width = 400,
      height = 300;

  let centerX = 150,
      centerY = 150,
      radius = 250,
      sides = 1000,
      coils = 20,
      rotation = 0;
  let count =0;
  let awayStep = radius/sides;
  let aroundStep = coils/sides;
  let aroundRadians = aroundStep * 2 * 3.14;
  rotation *= 2 * 3.14;

  let no_of_points_in_community = new_data1.length;
  let xCoordinateOfActiveNode_new, yCoordinateOfActiveNode_new;
  let node_name, deg, clo, bet, eig, volatility;

  for (let i=0; i<no_of_points_in_community;i++){
      let away = i * awayStep;
      let around = i * aroundRadians + rotation;

      new_data1[i]['new_x'] = centerX + Math.cos(around) * (away );
      new_data1[i]['new_y'] = centerY + Math.sin(around) * (away);

      if (new_data1[i]['node']== find_node_id)
      {
        xCoordinateOfActiveNode_new = new_data1[i]['new_x'];
        yCoordinateOfActiveNode_new = new_data1[i]['new_y'];
        node_name = new_data1[i]['name'];
        deg = new_data1[i]['centrality'];
        clo = new_data1[i]['closeness'];
        bet = new_data1[i]['betwness'];
        eig = new_data1[i]['eign'];
        volatility = new_data1[i]['volatility'];
      }
  }

  let adjacent_nodes_find_node = connections_list[find_node_id];
  d3.select("#community_spiral").select("svg").remove();
  d3.select("#node_spiral").select("svg").remove();
  d3.select("#community_textbox").html("");

  var svg_community = d3.select("#community_spiral").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g");

  var circles = svg_community.selectAll("circle")
                  .data(new_data1)
                .enter()
                  .append("circle")
                  .attr("cx", function (d) { return d.new_x; })
                  .attr("cy", function (d) { return d.new_y; })
                  .attr("r", function(d){
                    if (d.node == find_node_id) return 5;
                    else return 2;
                  })
                  .style("fill", function(d){
                    if (d.node == find_node_id) {
                      return "black";
                    }

                    if (adjacent_nodes_find_node.includes(d.node)){
                      count++;
                      svg_community.append('line')
                            .style("stroke", "#253494" )
                            .style("strokeOpacity",.5)
                            .style("stroke-width",1.5)
                            .attr("x1", xCoordinateOfActiveNode_new)
                            .attr("y1", yCoordinateOfActiveNode_new)
                            .attr("x2", d.new_x)
                            .attr("y2", d.new_y);
                      return "#253494";
                    }
                    else {
                      //--- ADDED FOR LOCAL VOLATILITY ---
                      if (localVolatilityColFlag == 1) {
                        // New local-volatility color logic
                        if (d.type === "outandin") return "#ca0020";
                        else if (d.type === "incoming") return "#0571b0";
                        else if (d.type === "outgoing") return "#f4a582";
                        else return "#92c5de"; // "neither"
                      }
                      // Otherwise, fall back to existing flags
                      if (densityColFlag ==1)
                        return colorscaleDensity(d.density);

                      else if (degreeColFlag==1){
                        if (d.centrality > extent_of_centralities_after_removing_outliers.degree_range[1])
                          return "black";
                        else
                          return colorscaleDegree(d.centrality);
                      }
                      else if (closenessColFlag==1){
                        if (d.closeness > extent_of_centralities_after_removing_outliers.closeness_range[1])
                          return "black";
                        else
                          return colorscaleCloseness(d.closeness);
                      }
                      else if (betweennessColFlag==1){
                        if (d.betwness > extent_of_centralities_after_removing_outliers.betwness_range[1])
                          return "black";
                        else
                          return colorscaleBetwness(d.betwness);
                      }
                      else if (eignColFlag==1){
                        if (d.eign > extent_of_centralities_after_removing_outliers.eign_range[1])
                          return "black";
                        else
                          return colorscaleEign(d.eign);
                      }
                      else if (volatilityColFlag==1){
                        if (d.volatility > extent_of_centralities_after_removing_outliers.volatility_range[1])
                          return "black";
                        else
                          return colorscaleVolatility(d.volatility);
                      }
                    }
                  });

  var centrality_data = new_data1.map(function(d){return d.centrality});
  draw_textbox(new_data1, adjacent_nodes_find_node, find_node_id, count, deg, bet, clo, eig, node_name);
}

// draw spiral in side window on click community
function draw_spiral(new_data1, adjacent_nodes, activeNode){

  var width = 400,
      height = 300;

  let centerX = 150,
      centerY = 150,
      radius = 150,
      sides = 450,
      coils = 20,
      rotation = 0;
  let awayStep = radius/sides;
  let aroundStep = coils/sides;
  let aroundRadians = aroundStep * 2 * 3.14;
  rotation *= 2 * 3.14;

  let count = 0;
  let no_of_points_in_community = new_data1.length;
  let xCoordinateOfActiveNode_new, yCoordinateOfActiveNode_new;
  let node_name, deg, clo, bet, eig, volatility;

  for (let i=0; i<no_of_points_in_community;i++){
      let away = (i+30) * awayStep;
      let around = (i+30) * aroundRadians + rotation;

      new_data1[i]['new_x'] = centerX + Math.cos(around) * (away );
      new_data1[i]['new_y'] = centerY + Math.sin(around) * (away);

      if (new_data1[i]['node']== activeNode)
      {
        node_name = new_data1[i]['name'];
        xCoordinateOfActiveNode_new = new_data1[i]['new_x'];
        yCoordinateOfActiveNode_new = new_data1[i]['new_y'];
        deg = new_data1[i]['centrality'];
        clo = new_data1[i]['closeness'];
        bet = new_data1[i]['betwness'];
        eig = new_data1[i]['eign'];
        volatility = new_data1[i]['volatility'];
      }
  }

  d3.select("#community_spiral").select("svg").remove();
  d3.select("#node_spiral").select("svg").remove();

  var svg_community = d3.select("#community_spiral").append("svg")
  .attr("viewBox", "0 0 300 200")  // Add viewBox
    .append("g")
    .attr("transform", "translate(0, -100)");  // Move group up

  var circles = svg_community.selectAll("circle")
                .data(new_data1)
              .enter()
                .append("circle")
                .attr("cx", function (d) { return d.new_x; })
                .attr("cy", function (d) { return d.new_y; })
                .attr("r", function(d){
                  if (d.node == find_node_id)
                    return 6;
                  else
                    return 1.5;
                })
                .style("fill", function(d){
                  if (d.node == find_node_id) {
                    return "black";
                  }

                  if (adjacent_nodes.includes(d.node)){
                    count++;
                    svg_community.append('line')
                          .style("stroke", "#253494" )
                          .style("strokeOpacity",.5)
                          .style("stroke-width",1.5)
                          .attr("x1", xCoordinateOfActiveNode_new)
                          .attr("y1", yCoordinateOfActiveNode_new)
                          .attr("x2", d.new_x)
                          .attr("y2", d.new_y);
                    return "#253494";
                  }
                  else {
                    //--- ADDED FOR LOCAL VOLATILITY ---
                    if (localVolatilityColFlag == 1) {
                      // New local-volatility color logic
                      if (d.type === "outandin") return "#ca0020";
                      else if (d.type === "incoming") return "#0571b0";
                      else if (d.type === "outgoing") return "#f4a582";
                      else return "#92c5de";
                    }

                    if (densityColFlag ==1)
                      return colorscaleDensity(d.density);
                    else if (degreeColFlag==1){
                      if (d.centrality > extent_of_centralities_after_removing_outliers.degree_range[1])
                        return "black";
                      else
                        return colorscaleDegree(d.centrality);
                    }
                    else if (closenessColFlag==1){
                      if (d.closeness > extent_of_centralities_after_removing_outliers.closeness_range[1])
                        return "black";
                      else
                        return colorscaleCloseness(d.closeness);
                    }
                    else if (betweennessColFlag==1){
                      if (d.betwness > extent_of_centralities_after_removing_outliers.betwness_range[1])
                        return "black";
                      else
                        return colorscaleBetwness(d.betwness);
                    }
                    else if (eignColFlag==1){
                      if (d.eign > extent_of_centralities_after_removing_outliers.eign_range[1])
                        return "black";
                      else
                        return colorscaleEign(d.eign);
                    }
                    else if (volatilityColFlag==1){
                      if (d.volatility > extent_of_centralities_after_removing_outliers.volatility_range[1])
                        return "black";
                      else
                        return colorscaleVolatility(d.volatility);
                    }
                  }
                });

  var centrality_data = new_data1.map(function(d){return d.centrality});
  draw_textbox(new_data1, adjacent_nodes, activeNode, count, deg, bet, clo, eig, node_name);
}

//convert node data from string to integers
function transform_data(data){
  data = data.map(d=> ({
    node : +d.node,
    centrality : +d.centrality,
    community : +d.community,
    density : parseFloat(d.density),
    volatility : parseFloat(d.volatility),
    name: d.name,
    x : +d.x,
    y: +d.y,
    type: d.type
  }));
  return data;
}

//convert node data from string to integers
function transform_link_data(data){
  data = data.map(d=> ({
    source : +d.source,
    target: +d.target,
    weight: +d.weight
  }));
  return data;
}

//convert node data from string to integers
function transform_node_to_node_link_data(data){
  data = data.map(d=> ({
    source : +d.source,
    target: +d.target,
    type: d.type
  }));
  return data;
}

//convert coarse graph center points from string to integers
function string_to_numbers_graph_centers(data){
  data = data.map(d=> ({
    community : +d.community,
    size : +d.count
  }));
  return data;
}

// By default, no filtering
window.currentNodeFilter = "none";

// Then, in your radio-button change events, you set:
document.querySelectorAll("input[name='nodeFilter']").forEach(radio => {
  radio.addEventListener("change", function() {
    window.currentNodeFilter = this.value;  // "none", "incoming", or "outgoing"
    
    // Re-apply opacity:
    d3.selectAll("circle").style("opacity", function(d) {
      if (window.currentNodeFilter === "incoming") {
        return d.type === "incoming" || d.type === "outandin" ? 1 : 0.2;
      } else if (window.currentNodeFilter === "outgoing") {
        return d.type === "outgoing" || d.type === "outandin" ? 1 : 0.2;
      } else if (window.currentNodeFilter === "both") {
        return d.type === "outandin" ? 1 : 0.2;
      } else {
        // "none" or anything else: show all
        return 1;
      }
    });
  });
});

function transform_graph_centers(data, height, width){
  let radius = 350,
      coils = 6,
      rotation = 0,
      sides = 100;
  let awayStep = radius/sides;
  let aroundStep = coils/sides;
  let aroundRadians = aroundStep * 2 * 3.14;
  rotation *= 2 * 3.14;

  let newdata1 = [];

  let no_of_points_in_community = data.length;
  for (let i=0; i<no_of_points_in_community;i++){
      let away = (i+5) * awayStep;
      let around = (i+5) * aroundRadians + rotation;

      data[i]['cx'] = 350 + Math.cos(around) * (away );
      data[i]['cy'] = 250 + Math.sin(around) * (away);
  }
  return data;
}

//--- MODIFIED FOR LOCAL VOLATILITY CENTERING ---
function computing_spiral_positions(center_positions_spiral, data_points, height, width) {

  let radius = 60,
      coils = 15,
      rotation = 0,
      sides = 400;
  let awayStep = radius/sides;
  let aroundStep = coils/sides;
  let aroundRadians = aroundStep * 2 * 3.14;
  rotation *= 2 * 3.14;

  let newdata1 = [];

  center_positions_spiral.forEach(function(community_data){
    // subset data for this community
    let filtered_community= data_points.filter(function(d){
      return d.community===community_data.community;
    });

    //--- ADDED FOR LOCAL VOLATILITY CENTERING ---
    if (localVolatilityCenteringFlag == 1) {
      // Reorder so that outandin => incoming => outgoing => neither
      let outandin = filtered_community.filter(d => d.type === "outandin");
      let incoming = filtered_community.filter(d => d.type === "incoming");
      let outgoing = filtered_community.filter(d => d.type === "outgoing");
      let neither = filtered_community.filter(d =>
        d.type !== "outandin" && d.type !== "incoming" && d.type !== "outgoing"
      );
      filtered_community = outandin.concat(outgoing, incoming, neither);
    }
    // now compute spiral positions, in the order they appear
    let no_of_points_in_community = filtered_community.length;

    for (let i=0; i<no_of_points_in_community; i++){
      let away, around;
      if (i < 300) {
        away = (i+100) * awayStep;
        around = (i+100) * aroundRadians + rotation;
      } else {
        // for bigger communities
        let new_awayStep = radius/25000;
        let new_aroundStep = coils/25000;
        let new_aroundRadians = new_aroundStep * 2 * 3.14;

        away = (299+100) * awayStep + ((i-299) * new_awayStep);
        around = (299+100) * aroundRadians + ((i-299) * new_aroundRadians + rotation);
      }

      filtered_community[i]['x'] = community_data.cx + Math.cos(around) * (away );
      filtered_community[i]['y'] = community_data.cy + Math.sin(around) * (away);
    }
    newdata1 = newdata1.concat(filtered_community);
  });
  return newdata1;
}

// Define the div for the tooltip
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

var count = 0;
function draw_spiral_community(){

  // if we have "most connected nodes" data, we reset find_node_id
  // if (most_connected_nodes_data)
  //   find_node_id = -1;

  g.selectAll(".brush").remove();
  count = count + 1;
  g.selectAll("circle").remove();

  //define scale
  let xExtent = d3.extent(global_data, d=>d.x);
  let xScale = d3.scaleLinear()
                  .domain(xExtent)
                  .range(xExtent);

  let yExtent = d3.extent(global_data, d=>d.y);
  let yScale = d3.scaleLinear()
                  .domain(yExtent)
                  .range(yExtent);

  let max_density = d3.max(global_data, d=>d.density);

  // define color scales
  colorscaleDensity = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([max_density, 0]);
  colorscaleDegree = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([extent_of_centralities_after_removing_outliers.degree_range[1],
                         extent_of_centralities_after_removing_outliers.degree_range[0] - 3]);
  colorscaleCloseness = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([extent_of_centralities_after_removing_outliers.closeness_range[1],
                         extent_of_centralities_after_removing_outliers.closeness_range[0]] );
  colorscaleBetwness = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([extent_of_centralities_after_removing_outliers.betwness_range[1],
                         extent_of_centralities_after_removing_outliers.betwness_range[0]]);
  colorscaleEign = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([extent_of_centralities_after_removing_outliers.eign_range[1],
                         extent_of_centralities_after_removing_outliers.eign_range[0]]);
  colorscaleVolatility = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([extent_of_centralities_after_removing_outliers.volatility_range[1],
                         extent_of_centralities_after_removing_outliers.volatility_range[0]]);

  gBrush = g.append("g")
    .attr("class", "brush");
  

  // define brush
  brush = d3.brush().on("end", function() {
    brushFlag = 1;
    var s = d3.brushSelection(this);
    if (!s) {
      if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
      xScale.domain(xExtent);
      yScale.domain(yExtent);
    } else {
      xScale.domain([s[0][0], s[1][0]].map(xScale.invert, xScale));
      yScale.domain([s[1][1], s[0][1]].map(yScale.invert, yScale));
      g.select(".brush").call(brush.move, null);
    }
    var t = g.transition().duration(750);
    g.selectAll("circle").transition(t)
        .attr("cx", function(d) { return xScale(d.x); })
        .attr("cy", function(d) { return yScale(d.y); });
    d3.selectAll(".spiral_edges").style("stroke-opacity", 0);
  });

  // call brush
  gBrush.call(brush);

  // scale for edge thickness
  var max_edge_strength = d3.max(link_data, function(d){return d.weight});
  var edge_strength_scale = d3.scaleLinear()
      .domain([0, max_edge_strength])
      .range([0.4, 6]);

  // add edges as lines
  for (let link in link_data){
    g.append('line')
      .attr("class", "spiral_edges")
      .style("stroke", "#DCDCDC")
      .style("strokeOpacity",0)
      .style("stroke-width", edge_strength_scale(link_data[link].weight))
      .attr("x1", center_positions_spiral[link_data[link].source].cx)
      .attr("y1", center_positions_spiral[link_data[link].source].cy)
      .attr("x2", center_positions_spiral[link_data[link].target].cx)
      .attr("y2", center_positions_spiral[link_data[link].target].cy)
      .on("mouseover", function(event, d){
        show_edge_tooltip(d.source, d.target, d.weight);
      });
  }
  g.selectAll(".spiral_edges").data(link_data).enter();

  // draw nodes
  var node = g.selectAll("circle")
              .data(global_data);

  var newElements = node.enter()
                  .append("circle")
                  .attr("class", "happy")
                  .attr("r", function(d){
                    if (d.node == find_node_id) return 4;
                    else return (highlightNodes.indexOf(d.node) !== -1) ? 3 : global_radius;
                  })
                  .style("stroke", function(d) {
                    return globalHighlightNodesMap[d.node] || "none";
                  })
                  .style("stroke-width", function(d) {
                    return globalHighlightNodesMap[d.node] ? 1 : 0;
                  })
                  .style("fill", function(d){
                    if (d.node == find_node_id) {
                      return "black";
                    }
                    
                    //--- ADDED FOR LOCAL VOLATILITY ---
                    if (localVolatilityColFlag == 1) {
                      if (d.type === "outandin") return "#ca0020";
                      else if (d.type === "incoming") return "#0571b0";
                      else if (d.type === "outgoing") return "#f4a582";
                      else return "#92c5de";
                    }

                    if (densityColFlag ==1) {
                      return colorscaleDensity(d.density);
                    }
                    else if (degreeColFlag==1){
                      if (d.centrality>extent_of_centralities_after_removing_outliers.degree_range[1])
                        return "black";
                      else
                        return colorscaleDegree(d.centrality);
                    }
                    else if (closenessColFlag==1){
                      if (d.closeness > extent_of_centralities_after_removing_outliers.closeness_range[1])
                        return "black";
                      else
                        return colorscaleCloseness(d.closeness);
                    }
                    else if (betweennessColFlag==1){
                      if (d.betwness > extent_of_centralities_after_removing_outliers.betwness_range[1])
                        return "black";
                      else
                        return colorscaleBetwness(d.betwness);
                    }
                    else if (eignColFlag==1){
                      if (d.eign > extent_of_centralities_after_removing_outliers.eign_range[1])
                        return "black";
                      else
                        return colorscaleEign(d.eign);
                    }
                    else if (volatilityColFlag==1){
                      if (d.volatility > extent_of_centralities_after_removing_outliers.volatility_range[1])
                        return "black";
                      else
                        return colorscaleVolatility(d.volatility);
                    }
                  })
                  .style("opacity", function(d) {
                    // Adjust based on the global radio-button filter
                    if (window.currentNodeFilter === "incoming") {
                      return d.type === "incoming" || d.type === "outandin" ? 1 : 0.2;
                    } else if (window.currentNodeFilter === "outgoing") {
                      return d.type === "outgoing" || d.type === "outandin" ? 1 : 0.2;
                    } else {
                      return 1;
                    }
                  })
                  .attr("pointer-events", "all")
                  .on("mouseover", function(event, d) {
                      div.transition()
                          .duration(200)
                          .style("opacity", .9);

                      if (flag_most_connected_nodes){
                        div.html("<b>Community:</b> " + d.community)
                           .style("left", (event.pageX) + "px")
                           .style("top", (event.pageY - 28) + "px");
                      } else {
                        div.html("<b>Author:</b> "+ d.name +"<br/>"
                               + "<b>Node ID:</b> "+ d.node +"<br/>"
                               + "<b>Group:</b> " + d.community + "<br/>"
                               + "<b>Total Collaborators:</b> "+ d.centrality)
                           .style("left", (event.pageX) + "px")
                           .style("top", (event.pageY - 28) + "px")
                           .style("text-align", "left");
                      }
                      drawNodeTimesliceChart(d.node);
                      

                      activeCommunity = d.community;
                      activeNode = d.node;
                      activeName = d.name;
                      let xCoordinateOfActiveNode = d.x;
                      let yCoordinateOfActiveNode = d.y;

                      d3.selectAll(".sideCommEllipse")
                      .filter(n => n.node === d.node)
                      .style("stroke", "orange")       // or some highlight color
                      .style("stroke-width", 5);

                      

                      // show adjacent node
                      let adjacent_nodes = connections_list[activeNode];

                      d3.selectAll("circle")
                        .attr("r", function(n){
                          if (adjacent_nodes.includes(n.node))
                            return global_radius;
                          else
                            return global_radius;
                        })
                        .style("fill", function(n){
                          if (adjacent_nodes.includes(n.node)){
                            // find edge
                            let edge = node_to_node_link_data.find(e => 
                              (e.source === activeNode && e.target === n.node) || 
                              (e.target === activeNode && e.source === n.node)
                            );
                            if (edge) {
                              let edgecolor = "#253494";
                              // The new color logic if we want to highlight differently:
                              if (window.currentNodeFilter === "incoming" && edge.type !== "incoming") {
                                // skip
                                edgecolor = "#253494";
                              } else if (window.currentNodeFilter === "outgoing" && edge.type !== "outgoing") {
                                // skip
                                edgecolor = "#253494";
                              } else {
                                // color edges based on type
                                if (edge.type === "incoming") edgecolor = "#0571b0";
                                else if (edge.type === "outgoing") edgecolor = "#f4a582";
                                else if (edge.type === "outandin") edgecolor = "#ca0020";
                              }
                              g.append('line')
                                .attr("class", "adjacent_edges")
                                .style("stroke", edgecolor)
                                .style("strokeOpacity", .5)
                                .style("stroke-width", 1)
                                .attr("x1", function(){
                                  if (brushFlag==1) return xScale(xCoordinateOfActiveNode);
                                  else return xCoordinateOfActiveNode;
                                })
                                .attr("y1", function(){
                                  if (brushFlag==1) return yScale(yCoordinateOfActiveNode);
                                  else return yCoordinateOfActiveNode;
                                })
                                .attr("x2", function(){
                                  if (brushFlag==1) return xScale(n.x);
                                  else return n.x;
                                })
                                .attr("y2", function(){
                                  if (brushFlag==1) return yScale(n.y);
                                  else return n.y;
                                });
                            }
                            return "#253494";
                          }
                          else {
                            //--- ADDED FOR LOCAL VOLATILITY ---
                            if (localVolatilityColFlag == 1) {
                              if (n.type === "outandin") return "#ca0020";
                              else if (n.type === "incoming") return "#0571b0"; 
                              else if (n.type === "outgoing") return "#f4a582";
                              else return "#92c5de";
                            }

                            if (densityColFlag ==1)
                              return colorscaleDensity(n.density);
                            else if (degreeColFlag==1){
                              if (n.centrality>extent_of_centralities_after_removing_outliers.degree_range[1])
                                return "black";
                              else
                                return colorscaleDegree(n.centrality);
                            }
                            else if (closenessColFlag==1){
                              if (n.closeness > extent_of_centralities_after_removing_outliers.closeness_range[1])
                                return "black";
                              else
                                return colorscaleCloseness(n.closeness);
                            }
                            else if (betweennessColFlag==1){
                              if (n.betwness > extent_of_centralities_after_removing_outliers.betwness_range[1])
                                return "black";
                              else
                                return colorscaleBetwness(n.betwness);
                            }
                            else if (eignColFlag==1){
                              if (n.eign > extent_of_centralities_after_removing_outliers.eign_range[1])
                                return "black";
                              else
                                return colorscaleEign(n.eign);
                            }
                            else if (volatilityColFlag==1){
                              if (n.volatility > extent_of_centralities_after_removing_outliers.volatility_range[1])
                                return "black";
                              else
                                return colorscaleVolatility(n.volatility);
                            }
                          }
                        });

                      new_data1 = global_data.filter(function(client){
                        return client.community==d.community;
                      });
                      draw_spiral(new_data1, adjacent_nodes, activeNode);
                      drawCommunityAdjMatrix(new_data1, node_to_node_link_data);
                      drawNodeTimesliceChart(d.node);
                      highlightMatrixNode(d.node);

                      // highlight row in the table
                      d3.selectAll("tr").style("background-color", function(dat,i){
                        if (dat!== undefined) {
                          if(dat.node == find_node_id)
                            return "blue";
                          else if (dat.node == activeNode)
                            return "orange";
                          else
                            return "transparent";
                        }
                      });

                      if (!flag_most_connected_nodes){
                        d3.selectAll("circle")
                          .attr("opacity", function(n){
                            if(n.community == activeCommunity) return 1;
                            else return 0.1;
                          });
                      }

                      if(brushFlag==0){
                        let all_lines = d3.selectAll(".spiral_edges")
                            .nodes();
                        for (let each in all_lines){
                          if(
                            parseInt(all_lines[each].x1.baseVal.value) == parseInt(center_positions_spiral[activeCommunity].cx) &&
                            parseInt(all_lines[each].y1.baseVal.value) == parseInt(center_positions_spiral[activeCommunity].cy) ||
                            parseInt(all_lines[each].x2.baseVal.value) == parseInt(center_positions_spiral[activeCommunity].cx )&&
                            parseInt(all_lines[each].y2.baseVal.value) == parseInt(center_positions_spiral[activeCommunity].cy)
                          ) {
                            all_lines[each].style.strokeOpacity = 1;
                          }
                          else {
                            all_lines[each].style.strokeOpacity = 0;
                          }
                        }
                      } else {
                        d3.selectAll(".spiral_edges").style("stroke-opacity", 0);
                      }
                  })
                  .on("mouseout", function(event, d) {

                    d3.selectAll(".sideCommEllipse")
                    .filter(n => n.node === d.node)
                    .style("stroke", "#333")
                    .style("stroke-width", 1);

                    
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);

                    d3.selectAll(".adjacent_edges").remove();
                    // d3.select("#nodeTimesliceChart").selectAll("*").remove();

                    d3.selectAll(".barLight")
                      .attr("class", "bar");

                    d3.selectAll(".strokechange")
                      .attr("class", "heat_map");

                    if(!flag_most_connected_nodes){
                      d3.selectAll("circle")
                        .attr("opacity", 1);
                    }
                    

                    d3.select("table").selectAll("tr").style("background-color", function(dat,i){
                      if (dat!== undefined) {
                        if (dat.node == find_node_id)
                          return "blue";
                        else
                          return "transparent";
                      }
                    });
                    
                    //highlightMatrixNode(null);

                    if (brushFlag==0) {
                      d3.selectAll(".spiral_edges").style("stroke-opacity", 1);
                    }
                    else {
                      d3.selectAll(".spiral_edges").style("stroke-opacity", 0);
                    }
                  })
                  .on("click", function(event, d) {
                    // Prevent propagation if needed
                    event.stopPropagation();

                    // Identify the timeslice (yearRange) in which the user clicked.
                    let clickedYearRange = window.currentYearRange || "UnknownYear";
                    let commID = d.community; 

                    // Check if this community from the current timeslice is already selected.
                    let alreadySelected = selectedCommunitySpirals.find(s => 
                      s.communityID === commID && s.yearRange === clickedYearRange
                    );
                    if (alreadySelected) {
                      return;
                    }

                    // Build the *original* community’s data from this timeslice.
                    let originalCommData = global_data.filter(n => n.community === commID);
                    let originalCommLinks = node_to_node_link_data.filter(e => {
                      let nodeIDs = new Set(originalCommData.map(n => n.node));
                      return nodeIDs.has(e.source) && nodeIDs.has(e.target);
                    });

                    // Create an object representing this selection.
                    let selectionObj = {
                      yearRange: clickedYearRange,
                      communityID: commID,
                      originalNodeData: originalCommData,
                      originalLinkData: originalCommLinks
                    };

                    // If we already have 3 selected, remove the oldest.
                    if (selectedCommunitySpirals.length >= 3) {
                      selectedCommunitySpirals.shift();
                    }
                    selectedCommunitySpirals.push(selectionObj);

                    // Define the highlight colors for each selection.
                    const highlightColors = ["gold", "magenta", "green"];
                    
                    // Build a mapping from node ID to its highlight color.
                    let highlightNodesMap = {};
                    selectedCommunitySpirals.forEach((sel, index) => {
                      let color = highlightColors[index] || "gold";
                      sel.originalNodeData.forEach(nodeObj => {
                        // If a node belongs to more than one selected community,
                        // assign it the color of the earliest selection.
                        if (!(nodeObj.node in highlightNodesMap)) {
                          highlightNodesMap[nodeObj.node] = color;
                        }
                      });
                    });
                    // Store the mapping globally.
                    globalHighlightNodesMap = highlightNodesMap;

                    // Update the main view so that every node gets its assigned color.
                    d3.selectAll("circle")
                      .style("stroke", function(n) {
                        return globalHighlightNodesMap[n.node] || "none";
                      })
                      .style("stroke-width", function(n) {
                        return globalHighlightNodesMap[n.node] ? 2 : 0;
                      });

                    // Now update the side widget with the persistent community spirals.
                    updateCommunitySpiralSideWidget();
                  });
                  

  // Assume "node" is your d3 selection for the circles (nodes)
  // After entering and before the transition, update the merge like this:
  node.merge(newElements)
  .transition()
  .duration(750)
  .attr("cx", function(d) { return xScale(d.x); })
  .attr("cy", function(d) { return yScale(d.y); });


  g.selectAll(".axis").remove();
  g.selectAll(".text_for_legend").remove();
  var legendheight = 200,
      legendwidth = 80,
      margin = {top: 10, right: 60, bottom: 10, left: 2};

  var canvas = d3.select("#legend1")
    .style("height", legendheight + "px")
    .style("width", legendwidth + "px")
    .style("position", "relative")
    .append("canvas")
    .attr("height", legendheight - margin.top - margin.bottom)
    .attr("width", 1)
    .style("height", (legendheight - margin.top - margin.bottom) + "px")
    .style("width", (legendwidth - margin.left - margin.right) + "px")
    .style("border", "1px solid #000")
    .style("position", "absolute")
    .style("top",  (margin.top) +"px")
    .style("left", (margin.left) + "px")
    .node();

  var ctx = canvas.getContext("2d");

  let domain_used_for_legend;
  if (densityColFlag ==1)
    domain_used_for_legend= colorscaleDensity.domain();
  else if (degreeColFlag==1)
    domain_used_for_legend=  colorscaleDegree.domain();
  else if (closenessColFlag==1)
    domain_used_for_legend=  colorscaleCloseness.domain();
  else if (betweennessColFlag==1)
    domain_used_for_legend =  colorscaleBetwness.domain();
  else if (eignColFlag==1)
    domain_used_for_legend= colorscaleEign.domain();
  else if (volatilityColFlag==1)
    domain_used_for_legend= colorscaleVolatility.domain();
  else {
    // If localVolatilityColFlag == 1, the "legend" is not numeric-based,
    // so you can skip or just give a dummy domain
    if (localVolatilityColFlag == 1) {
      domain_used_for_legend = [0,1];
    }
  }

  var legendscale = d3.scaleLinear()
    .range([1, legendheight - margin.top - margin.bottom])
    .domain(domain_used_for_legend || [0,1]);

  var image = ctx.createImageData(1, legendheight);
  d3.range(legendheight).forEach(function(i) {
    let c;
    if (densityColFlag ==1) c = d3.rgb(colorscaleDensity(legendscale.invert(i)));
    else if (degreeColFlag==1) c = d3.rgb(colorscaleDegree(legendscale.invert(i)));
    else if (closenessColFlag==1) c = d3.rgb(colorscaleCloseness(legendscale.invert(i)));
    else if (betweennessColFlag==1) c = d3.rgb(colorscaleBetwness(legendscale.invert(i)));
    else if (eignColFlag==1) c = d3.rgb(colorscaleEign(legendscale.invert(i)));
    else if (volatilityColFlag==1) c = d3.rgb(colorscaleVolatility(legendscale.invert(i)));
    else {
      // fallback
      c = d3.rgb("#ccc");
    }
    image.data[4*i] = c.r;
    image.data[4*i + 1] = c.g;
    image.data[4*i + 2] = c.b;
    image.data[4*i + 3] = 255;
  });
  ctx.putImageData(image, 0, 0);

  var legendaxis = d3.axisRight()
    .scale(legendscale)
    .tickSize(6)
    .ticks(8);

  d3.select("#legend1")
    .attr("height", (legendheight) + "px")
    .attr("width", (legendwidth) + "px")
    .style("position", "absolute")
    .style("left", "15px")
    .style("top", margin.top );

  g.append("g")
   .attr("class", "axis")
   .attr("transform", "translate(" + (legendwidth - margin.left - margin.right + 3) + "," + (margin.top) + ")")
   .call(legendaxis);

  let text_for_legend;
  if (densityColFlag ==1) text_for_legend = "Density";
  else if (degreeColFlag==1) text_for_legend =  "   Degree";
  else if (closenessColFlag==1) text_for_legend=  "   Closeness";
  else if (betweennessColFlag==1) text_for_legend =  "Betweeness";
  else if (eignColFlag==1) text_for_legend = "Eigen";
  else if (volatilityColFlag==1) text_for_legend = "    Volatility";
  else if (localVolatilityColFlag==1) text_for_legend = "    Local Volatility";

  g.append("g")
   .attr("class", "text_for_legend")
   .append("text")
   .text(text_for_legend || "")
   .attr("transform", "translate( 0 ," + (legendheight+10) + ")");
}

function drawNodeTimesliceChart(nodeID) {
  // 1) Build stackedData for each timeslice, counting edges by edge type:
  //    Also get nodeType from allYearsNodeData

  let stackedData = [];

  years.forEach(yr => {
    let nodeDataThisSlice = allYearsNodeData[yr] || {};
    let edgeDataThisSlice = allYearsNodeLinks[yr] || [];

    let nodeObj = nodeDataThisSlice[nodeID]; 
    let nodeType = nodeObj ? nodeObj.type : "none";  // fallback if node doesn't exist in that slice

    // filter edges that involve nodeID
    let nodeEdges = edgeDataThisSlice.filter(e => (e.source === nodeID || e.target === nodeID));

    let incomingCount = 0, outgoingCount = 0, outandinCount = 0, noneCount = 0;
    nodeEdges.forEach(e => {
      if (e.type === "incoming") incomingCount++;
      else if (e.type === "outgoing") outgoingCount++;
      else if (e.type === "outandin") outandinCount++;
      else noneCount++;
    });

    stackedData.push({
      year: yr,
      incoming: incomingCount,
      outgoing: outgoingCount,
      outandin: outandinCount,
      none: noneCount,
      nodeType: nodeType   // store the node's own type
    });
  });

  // 2) Clear old chart
  d3.select("#nodeTimesliceChart").selectAll("*").remove();

  // 3) Dimensions
  let margin = { top: 30, right: 10, bottom: 40, left: 60 },
      width = 300 - margin.left - margin.right,
      height = 200 - margin.top - margin.bottom;

  let svg = d3.select("#nodeTimesliceChart")
              .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

  // 4) subgroups for the stacked bar = edge types
  let subgroups = ["incoming","outgoing","outandin","none"];

  // 5) x scale => timeslices
  let x = d3.scaleBand()
            .domain(stackedData.map(d => d.year))
            .range([0, width])
            .padding(0.2);

  // 6) Compute max stacked height
  //    totalEdges = incoming+outgoing+outandin+none for each slice
  let maxVal = d3.max(stackedData, d => d.incoming + d.outgoing + d.outandin + d.none);

  // 7) y scale
  let y = d3.scaleLinear()
            .domain([0, maxVal])
            .range([height, 0]);

  // 8) Color scale for the *edge* types in the stack
  let colorEdgeType = d3.scaleOrdinal()
    .domain(subgroups)
    .range(["#0571b0", "#f4a582", "#ca0020", "#92c5de"]); 
  // incoming => blue, outgoing => orange, outandin => red, none => purple

  // 9) Stacking
  let stackedSeries = d3.stack()
    .keys(subgroups)
    (stackedData);

  // 10) Draw stacked bars
  svg.selectAll("g.layer")
    .data(stackedSeries)
    .enter()
    .append("g")
      .attr("fill", d => colorEdgeType(d.key))
    .selectAll("rect")
    .data(d => d)
    .enter()
    .append("rect")
      .attr("x", d => x(d.data.year))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

  // 11) x-axis & y-axis with integer ticks on y
  let xAxis = d3.axisBottom(x);
  let yAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format("d"));

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  svg.append("g")
    .call(yAxis);

  // 11a) Add x-axis label: "Timeslices"
  svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "middle")
    .attr("x", width/2)
    .attr("y", height + margin.bottom - 5)
    .attr("fill", "black")
    .text("Timeslices");

  // 11b) Add y-axis label: "No. of Edges"
  svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", -margin.left + 15)
    .attr("fill", "black")
    .text("No. of Edges");

  // 12) Add the ellipse for the *node's own type* at the top
  //     i.e. we find the total stacked height => (incoming+outgoing+outandin+none)
  //     and place an ellipse ~10 px above it
  svg.selectAll(".nodeTypeEllipse")
    .data(stackedData)
    .enter()
    .append("ellipse")
      .attr("class", "nodeTypeEllipse")
      .attr("cx", d => x(d.year) + x.bandwidth()/2)
      .attr("cy", d => {
        let sumEdges = d.incoming + d.outgoing + d.outandin + d.none;
        let topY = y(sumEdges);
        return topY - 10; // 10 px above top
      })
      .attr("rx", 8)
      .attr("ry", 5)
      .attr("fill", d => {
        // For the node's type, not the edge type
        if (d.nodeType === "incoming") return "#0571b0";
        else if (d.nodeType === "outgoing") return "#f4a582";
        else if (d.nodeType === "outandin") return "#ca0020";
        else return "#92c5de"; // fallback 
      });

  // *No legends* as you requested
}







// // 8) Add prominent colored ellipses at the top of each bar
// svg.selectAll(".ellipse")
// .data(barData)
// .enter()
// .append("ellipse")
//   .attr("cx", d => x(d.year) + x.bandwidth() / 2) // Center horizontally
//   .attr("cy", d => y(d.edges) - 10) // Position above the bar
//   .attr("rx", 8) // Horizontal radius of the ellipse
//   .attr("ry", 5) // Vertical radius of the ellipse
//   .attr("fill", d => {
//     if (d.type === "outgoing") return "#f4a582";
//     else if (d.type === "incoming") return "#0571b0";
//     else if (d.type === "outandin") return "#ca0020";
//     else return "#92c5de"; // Default color for "none"
//   });




function drawCommunityAdjMatrix(new_data1, node_to_node_link_data) {
  // 1) Sort the community nodes by ID so rows/columns are consistent
  new_data1.sort((a, b) => d3.ascending(a.node, b.node));

  // 2) Build a quick lookup of edges for this community
  let edgeMap = new Map();
  let edgesInThisCommunity = [];

  // Also build a small adjacency map => adjacency[nodeID] = array of neighborIDs
  let adjacency = {};

  // Initialize adjacency lists
  new_data1.forEach(n => {
    adjacency[n.node] = [];
  });

  node_to_node_link_data.forEach(e => {
    let inCommSource = new_data1.some(n => n.node === e.source);
    let inCommTarget = new_data1.some(n => n.node === e.target);
    if (inCommSource && inCommTarget) {
      // For undirected, store minID,maxID as key
      let minID = Math.min(e.source, e.target);
      let maxID = Math.max(e.source, e.target);
      let key = `${minID},${maxID}`;
      edgeMap.set(key, e.type || "none");

      edgesInThisCommunity.push(e);

      // Populate adjacency
      adjacency[e.source].push(e.target);
      adjacency[e.target].push(e.source);
    }
  });

  // 3) Remove old matrix
  d3.select("#communityMatrix").selectAll("*").remove();

  // 4) Compute community-level stats (for legend)
  let totalEdges = edgesInThisCommunity.length;
  let incomingCount = 0, outgoingCount = 0, outandinCount = 0, noneCount = 0;
  edgesInThisCommunity.forEach(e => {
    if (e.type === "incoming") incomingCount++;
    else if (e.type === "outgoing") outgoingCount++;
    else if (e.type === "outandin") outandinCount++;
    else noneCount++;
  });

  // 5) Make a small legend for the matrix
  let legendDiv = d3.select("#communityMatrixLegend")
                    .style("font-size", "12px")
                    //.style("margin", "6px 0px");

                    legendDiv.html(`
                      <div align:"right">
                        <b>Community Information:</b> <br>
                        <span>Total Edges: ${totalEdges}</span> <br>
                        <span>Incoming: ${incomingCount}</span> <br>
                        <span>Outgoing: ${outgoingCount}</span> <br>
                        <span>Both: ${outandinCount}</span> <br>
                        <span>Stable: ${noneCount}</span>
                      </div>
                    `);

  // 6) Basic geometry
  let size = new_data1.length;
  let cellSize = 5;
  let margin = 4;
  let totalSize = margin * 2 + size * cellSize;

  let svg = d3.select("#communityMatrix")
              .append("svg")
              .attr("width", totalSize)
              .attr("height", totalSize);

  // 7) Our color function for the edge type
  function colorByEdgeType(type) {
    if (type === "incoming")  return "#0571b0"; // e.g. blue
    else if (type === "outgoing")  return "#f4a582"; // e.g. orange
    else if (type === "outandin")  return "#ca0020"; // e.g. red
    else return "white"; // fallback color
  }

  // 8) Build array of row/col pairs
  let matrixPairs = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      matrixPairs.push({
        rowIndex: r,
        colIndex: c,
        rowNode: new_data1[r],
        colNode: new_data1[c]
      });
    }
  }

  // 9) Draw the cells
  let cellSelection = svg.selectAll(".cell")
    .data(matrixPairs)
    .enter()
    .append("rect")
      .attr("class", "cell")
      .attr("x", d => margin + d.colIndex * cellSize)
      .attr("y", d => margin + d.rowIndex * cellSize)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("stroke", "#ccc")
      .attr("fill", d => {
        // diagonal => #eee
        if (d.rowNode.node === d.colNode.node) return "#eee";

        let minID = Math.min(d.rowNode.node, d.colNode.node);
        let maxID = Math.max(d.rowNode.node, d.colNode.node);
        let key = `${minID},${maxID}`;
        let etype = edgeMap.get(key);
        return colorByEdgeType(etype);
      })
      .on("mouseover", function(event, d) {
        // Show a tooltip with (source, target)
        d3.select("#adjMatrixTooltip")
          .style("opacity", 1)
          .style("left", (event.pageX + 8) + "px")
          .style("top", (event.pageY - 20) + "px")
          .html(`Source: ${d.rowNode.node}<br/>Target: ${d.colNode.node}`);
      })
      .on("mouseout", function() {
        d3.select("#adjMatrixTooltip")
          .style("opacity", 0);
      });

  // 10) Row labels
  let rowLabels = svg.selectAll(".rowLabel")
    .data(new_data1)
    .enter()
    .append("text")
      .attr("class", "rowLabel")
      .attr("x", margin - 5)
      .attr("y", (d, i) => margin + i * cellSize + cellSize*0.65)
      .attr("text-anchor", "end")
      .style("font-size", "10px")
      .text(d => d.node)
      .on("mouseover", function(event, d) {
        // 1) Clear existing highlight
        rowLabels.style("fill", "black");
        colLabels.style("fill", "black");

        // 2) The hovered node => highlight in red
        d3.select(this).style("fill", "red");

        // 3) highlight neighbors in blue
        let nodeID = d.node;
        let neighbors = adjacency[nodeID];
        // For each neighbor, highlight rowLabels & colLabels in blue
        rowLabels.filter(n => neighbors.includes(n.node))
                 .style("fill", "blue");
        colLabels.filter(n => neighbors.includes(n.node))
                 .style("fill", "blue");
      })
      .on("mouseout", function() {
        // Reset all labels to black
        rowLabels.style("fill", "black");
        colLabels.style("fill", "black");
      });

  // 11) Column labels
  let colLabels = svg.selectAll(".colLabel")
    .data(new_data1)
    .enter()
    .append("text")
      .attr("class", "colLabel")
      .attr("x", (d, i) => margin + i * cellSize + cellSize*0.5)
      .attr("y", margin - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text(d => d.node)
      .on("mouseover", function(event, d) {
        // 1) Clear existing highlight
        rowLabels.style("fill", "black");
        colLabels.style("fill", "black");

        // 2) The hovered node => highlight in red
        d3.select(this).style("fill", "red");

        // 3) highlight neighbors in blue
        let nodeID = d.node;
        let neighbors = adjacency[nodeID];
        rowLabels.filter(n => neighbors.includes(n.node))
                 .style("fill", "blue");
        colLabels.filter(n => neighbors.includes(n.node))
                 .style("fill", "blue");
      })
      .on("mouseout", function() {
        // Reset all labels
        rowLabels.style("fill", "black");
        colLabels.style("fill", "black");
      });

  // 12) Save references if you want to highlight from the spiral as well
  window.__currentCommunityMatrix__ = {
    rowLabels, colLabels, cellSelection, new_data1,
    edgesInThisCommunity, edgeMap
  };
}



function highlightMatrixNode(nodeID) {
  if (!window.__currentCommunityMatrix__) return;

  let {
    rowLabels, 
    colLabels, 
    cellSelection, 
    new_data1,
    edgesInThisCommunity, 
    edgeMap
  } = window.__currentCommunityMatrix__;

  // 1) Clear old highlights: revert to black/normal
  rowLabels.style("fill","black").style("font-weight","normal");
  colLabels.style("fill","black").style("font-weight","normal");

  if (nodeID == null) {
    return; // no node hovered => no highlight
  }

  // 2) Find neighbors of nodeID within the community
  //    We can do that by scanning edgesInThisCommunity
  let neighborIDs = new Set();
  edgesInThisCommunity.forEach(e => {
    if (e.source === nodeID) neighborIDs.add(e.target);
    if (e.target === nodeID) neighborIDs.add(e.source);
  });

  // 3) Highlight the hovered node in RED
  rowLabels.filter(d => d.node === nodeID)
           .style("fill","red")
           .style("font-weight","bold");
           //.raise();
  colLabels.filter(d => d.node === nodeID)
           .style("fill","red")
           .style("font-weight","bold");
           //.raise();

  // 4) Highlight the neighbors in BLUE
  rowLabels.filter(d => neighborIDs.has(d.node))
           .style("fill","blue")
           .style("font-weight","bold");
           //.raise();

  colLabels.filter(d => neighborIDs.has(d.node))
           .style("fill","blue")
           .style("font-weight","bold");
           //raise();
}


///////////////////////////////////////////////
// GLOBAL MAP + HELPER for Random Community Colors
///////////////////////////////////////////////
let randomColorsByTimeslice = {};

function getRandomColorForTimesliceCommunity(timeslice, commID) {
  if (!randomColorsByTimeslice[timeslice]) {
    randomColorsByTimeslice[timeslice] = {};
  }
  if (!randomColorsByTimeslice[timeslice][commID]) {
    let randHex = "#" + (Math.random().toString(16) + "000000").slice(2, 8);
    randomColorsByTimeslice[timeslice][commID] = randHex;
  }
  return randomColorsByTimeslice[timeslice][commID];
}

/**
++  * Consistent colour for an edge or node type, shared by main view and side widgets
++  */
 function getEdgeColorByType(t){
   if (t === "incoming")  return "#0571b0";   // blue
   if (t === "outgoing")  return "#f4a582";   // orange
   if (t === "outandin")  return "#ca0020";   // red
   return "#92c5de";                          // “neither” / undefined
}


///////////////////////////////////////////////
// UPDATE COMMUNITY SPIRAL SIDE WIDGET
///////////////////////////////////////////////
function updateCommunitySpiralSideWidget() {
  // If nothing is selected, clear out the side container and return.
  if (selectedCommunitySpirals.length === 0) {
    d3.select("#communitySideContainer").html("");
    return;
  }

  const highlightColors = ["gold", "magenta", "green"];

  // 1) Wipe the existing contents each time we refresh
  d3.select("#communitySideContainer").html("");

  // 2) Loop over each selected community spiral to draw them stacked
  selectedCommunitySpirals.forEach((selObj, index) => {
    // selObj is an object like:
    //   {
    //     yearRange: "...",
    //     communityID: ...,
    //     originalNodeData: [...],
    //     originalLinkData: [...]
    //   }

    // Make a unique ID for this sub-container
    let subDivID = `sideSpiralDiv_${index}`;
    let thisHighlightColor = highlightColors[index] || "gold";

    // Append a <div> block to hold label, button, and the spiral svg
    let sideDiv = d3.select("#communitySideContainer")
      .append("div")
      .attr("id", subDivID)
      .style("border", "1px solid #ccc")
      .style("padding", "6px")
      .style("margin-bottom", "10px");

    // 2a) Header row: label + "Unselect" button
    let headerRow = sideDiv.append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("align-items", "center");

    headerRow.append("span")
      .html(`<b>Community ${selObj.communityID} from ${selObj.yearRange}</b>`);

    headerRow.append("button")
      .text("Unselect")
      .on("click", function() {
        // 1) Remove this selection from the global array
        selectedCommunitySpirals.splice(index, 1);

        // 2) Rebuild the color mapping from the remaining selections
        let newHighlightMap = {};
        selectedCommunitySpirals.forEach((sel, i) => {
          let color = highlightColors[i] || "gold";
          sel.originalNodeData.forEach(nodeObj => {
            // If not already assigned, give it this color
            if (!(nodeObj.node in newHighlightMap)) {
              newHighlightMap[nodeObj.node] = color;
            }
          });
        });
        globalHighlightNodesMap = newHighlightMap;

        // 3) Update the main chart's node strokes
        d3.selectAll(".happy")
          .style("stroke", function(d) {
            return globalHighlightNodesMap[d.node] || "none";
          })
          .style("stroke-width", function(d) {
            return globalHighlightNodesMap[d.node] ? 2 : 0;
          });

        // 4) Re-render the side widget so it rebuilds without the removed community
        updateCommunitySpiralSideWidget();
      });

    ///////////////////////////////////////////////////////
    // 2a.1) ADD A CHECKBOX to toggle random community colors
    ///////////////////////////////////////////////////////
    // We'll store a boolean on selObj for each side widget
    selObj.randomColorActive = selObj.randomColorActive || false;

    let checkboxRow = sideDiv.append("div")
      .style("margin-top", "6px");

    checkboxRow.append("input")
      .attr("type", "checkbox")
      .attr("id", `randomColorCheckbox_${index}`)
      .property("checked", selObj.randomColorActive)
      .on("change", function() {
        selObj.randomColorActive = this.checked;
        // Re-draw fill colors on the ellipse selection
        nodeSel.style("fill", function(d) {
          // Re-run the same fill logic with the updated flag
          if (!currentNodeMap.has(d.node)) {
            return "gray";
          }
          let cNode = currentNodeMap.get(d.node);
          let currentTS = window.currentYearRange || "UnknownTimeslice";
          let commID = cNode.community;

          // if randomColorActive => random color by (timeslice, commID)
          if (selObj.randomColorActive) {
            return getRandomColorForTimesliceCommunity(currentTS, commID);
          } else {
            // else fallback to whichever colFlag logic you have
            return getColorBasedOnFlags(cNode);
          }
        });
      });

    checkboxRow.append("label")
      .attr("for", `randomColorCheckbox_${index}`)
      .style("margin-left", "4px")
      .text("Random color by timeslice community");


    ///////////////////////////////////////////////////////
    // 2b) Prepare the SVG for the spiral (unchanged)
    ///////////////////////////////////////////////////////
    let svgWidth = 400,
        svgHeight = 300;

    let spiralSvg = sideDiv.append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .attr("id", `sideSpiralSvg_${index}`);

    // 2c) Get the original node/link data for this community
    let sideData = selObj.originalNodeData;   // array of node objects from the time of click
    let edgesOriginal = selObj.originalLinkData || [];

    // 2d) Also figure out which of these nodes still exist in the *current* timeslice
    //     That means checking global_data for node matches
    let currentNodeMap = new Map();
    global_data.forEach(n => currentNodeMap.set(n.node, n));

    // 2e) Among those that exist in current timeslice, find which edges exist in the current timeslice
    //     using node_to_node_link_data. (These are the "current" edges.)
    let sideNodeIDs = new Set(sideData.map(d => d.node));
    let edgesCurrent = node_to_node_link_data.filter(e =>
      sideNodeIDs.has(e.source) && sideNodeIDs.has(e.target)
    );

    // 3) Compute spiral layout for sideData (original timeslice)
    let centerX = 150,
        centerY = 150,
        radius = 800,
        sides = 450,
        coils = 25,
        rotation = 0;
    let awayStep = radius / sides;
    let aroundStep = coils / sides;
    let aroundRadians = aroundStep * 2 * Math.PI;

    sideData.forEach((d, i) => {
      let away = (i + 30) * awayStep;
      let around = (i + 30) * aroundRadians + rotation;
      d.new_x = centerX + Math.cos(around) * away;
      d.new_y = centerY + Math.sin(around) * away;
    });

    // 4) Draw edges in two layers: (a) current timeslice edges, (b) original edges
    let edgesG = spiralSvg.append("g").attr("class", "sideEdgesG");
    let nodesG = spiralSvg.append("g").attr("class", "sideNodesG");

    // "Current" edges in gold, shown by default
    let edgesCurrentSel = edgesG.selectAll(".edgeCurrent")
      .data(edgesCurrent)
      .enter()
      .append("line")
        .attr("class", "edgeCurrent")
        .style("stroke", d => getEdgeColorByType(d.type))
        .style("stroke-opacity", 0.25)
        .style("stroke-width", 1.5)
        .style("opacity", 1)
        .attr("x1", d => {
          let src = sideData.find(n => n.node === d.source);
          return src ? src.new_x : 0;
        })
        .attr("y1", d => {
          let src = sideData.find(n => n.node === d.source);
          return src ? src.new_y : 0;
        })
        .attr("x2", d => {
          let tgt = sideData.find(n => n.node === d.target);
          return tgt ? tgt.new_x : 0;
        })
        .attr("y2", d => {
          let tgt = sideData.find(n => n.node === d.target);
          return tgt ? tgt.new_y : 0;
        });

    edgesCurrentSel.raise();  // move above circles if desired

    // "Original" edges in red, hidden by default
    let edgesOriginalSel = edgesG.selectAll(".edgeOriginal")
      .data(edgesOriginal)
      .enter()
      .append("line")
        .attr("class", "edgeOriginal")
        .style("stroke", d => getEdgeColorByType(d.type))
        //.style("stroke-opacity", 0.15)
        .style("stroke-width", 1.5)
        .style("opacity", 0)
        .attr("x1", d => {
          let src = sideData.find(n => n.node === d.source);
          return src ? src.new_x : 0;
        })
        .attr("y1", d => {
          let src = sideData.find(n => n.node === d.source);
          return src ? src.new_y : 0;
        })
        .attr("x2", d => {
          let tgt = sideData.find(n => n.node === d.target);
          return tgt ? tgt.new_x : 0;
        })
        .attr("y2", d => {
          let tgt = sideData.find(n => n.node === d.target);
          return tgt ? tgt.new_y : 0;
        });

    /////////////////////////////////////////////////////////////////////
    // 5) Draw the nodes (original timeslice positions), ADD FLAG CHECK
    /////////////////////////////////////////////////////////////////////
    let nodeSel = nodesG.selectAll(".sideCommEllipse")
      .data(sideData)
      .enter()
      .append("ellipse")
        .attr("class", "sideCommEllipse")
        .attr("cx", d => d.new_x)
        .attr("cy", d => d.new_y)
        .attr("rx", 4)
        .attr("ry", 4)
        .style("stroke", "#333")
        .style("stroke-width", 1)
        // Fade out if the node no longer exists in the current timeslice
        .style("opacity", d => currentNodeMap.has(d.node) ? 1 : 0.25)
        .style("fill", function(d) {
          // If the node is gone in the current timeslice => gray
          if (!currentNodeMap.has(d.node)) {
            return "gray";
          }
          // Otherwise, get node's community in current timeslice
          let cNode = currentNodeMap.get(d.node);
          let currentTS = window.currentYearRange || "UnknownTimeslice";
          let commID = cNode.community;

          // If checkbox is ON => random color by (timeslice, commID)
          if (selObj.randomColorActive) {
            return getRandomColorForTimesliceCommunity(currentTS, commID);
          } else {
            // else fallback to whichever colFlag is set
            return getColorBasedOnFlags(cNode);
          }
        });

    // 6) Optional hover info text
    let hoverInfo = spiralSvg.append("text")
      .attr("class", "hoverInfo")
      .attr("x", 100)
      .attr("y", svgHeight - 20) // near bottom of SVG
      .attr("fill", "black")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("");

    // 7) Node mouseover/mouseout
    nodeSel.on("mouseover", function(event, d) {
      // If this node is still in the *current* timeslice, we highlight things
      if (currentNodeMap.has(d.node)) {
        let cNode = currentNodeMap.get(d.node);  // current timeslice node
        hoverInfo.text(`Author: ${d.name} \n\n Node ID: ${d.node}`);

        // Same bar chart as main
        drawNodeTimesliceChart(d.node);

        // Hide current edges
        edgesCurrentSel.style("opacity", 0);
        // Show only the original edges for this node
        edgesOriginalSel.style("opacity", e => 
          (e.source === d.node || e.target === d.node) ? 1 : 0
        );

        // Highlight this ellipse in the side spiral
        d3.select(this)
          .style("stroke", d => getEdgeColorByType(d.type))
          //.style("stroke-opacity", 0.15)
          .style("stroke-width", 2);

        // Also highlight in the main chart
        d3.selectAll(".happy")
          .filter(n => n.node === d.node)
          .style("stroke", "blue")
          .style("stroke-width", 3);

        // Additional logic if you want to show adjacency or a sub-spiral
        let currentCommID = cNode.community;
        
        // Rebuild the same adjacency info
        let adjacent_nodes = connections_list[d.node] || [];
        let new_data1 = global_data.filter(x => x.community === cNode.community);
        let count = 0;
        adjacent_nodes.forEach(adjID => {
          if (new_data1.some(n => n.node === adjID)) {
            count++;
          }
        });

        let deg = cNode.centrality,
            bet = cNode.betwness,
            clo = cNode.closeness,
            eig = cNode.eign,
            nodeName = cNode.name;

        // Now call draw_textbox with new_data1
        draw_textbox(new_data1, adjacent_nodes, d.node, count, deg, bet, clo, eig, nodeName);

        // Possibly draw a small spiral for that community or call draw_spiral, etc.:
        draw_spiral(new_data1, adjacent_nodes, cNode.node);
        // draw_textbox(new_data1, adjacent_nodes, cNode.node, count, deg, bet, clo, eig, nodeName);

        // Possibly also update adjacency matrix
        drawCommunityAdjMatrix(new_data1, node_to_node_link_data);
      }
    })
    .on("mouseout", function(event, d) {
      // Restore edges
      edgesCurrentSel.style("opacity", 1);
      edgesOriginalSel.style("opacity", 0);

      // Restore hover text
      hoverInfo.text("");

      // Un-highlight this node
      d3.select(this)
        .style("stroke", "#333")
        .style("stroke-width", 1);

      // Also revert highlight in main chart
      d3.selectAll(".happy")
        .filter(n => n.node === d.node)
        .style("stroke", function(n) {
          // If it's in highlightNodes from some other selection, keep gold border
          return globalHighlightNodesMap[d.node] || "none";
        })
        .style("stroke-width", function(n) {
          return globalHighlightNodesMap[d.node] ? 1 : 0;
        });
    });

  }); // end of forEach over selectedCommunitySpirals
}

//////////////////////////////////////////
// HELPER: Use ColFlag to pick a color
//////////////////////////////////////////
// Adjust to your actual flag logic:
function getColorBasedOnFlags(nodeObj) {
  //  Example logic for your existing flags:
  if (localVolatilityColFlag == 1) {
    if (nodeObj.type === "outandin") return "#ca0020";
    else if (nodeObj.type === "incoming") return "#0571b0";
    else if (nodeObj.type === "outgoing") return "#f4a582";
    else return "#92c5de";
  }
  else if (densityColFlag == 1) {
    return colorscaleDensity(nodeObj.density);
  }
  else if (degreeColFlag == 1) {
    if (nodeObj.centrality > extent_of_centralities_after_removing_outliers.degree_range[1]) {
      return "black";
    } else {
      return colorscaleDegree(nodeObj.centrality);
    }
  }
  else if (closenessColFlag == 1) {
    if (nodeObj.closeness > extent_of_centralities_after_removing_outliers.closeness_range[1]) {
      return "black";
    } else {
      return colorscaleCloseness(nodeObj.closeness);
    }
  }
  else if (betweennessColFlag == 1) {
    if (nodeObj.betwness > extent_of_centralities_after_removing_outliers.betwness_range[1]) {
      return "black";
    } else {
      return colorscaleBetwness(nodeObj.betwness);
    }
  }
  else if (eignColFlag == 1) {
    if (nodeObj.eign > extent_of_centralities_after_removing_outliers.eign_range[1]) {
      return "black";
    } else {
      return colorscaleEign(nodeObj.eign);
    }
  }
  else if (volatilityColFlag == 1) {
    if (nodeObj.volatility > extent_of_centralities_after_removing_outliers.volatility_range[1]) {
      return "black";
    } else {
      return colorscaleVolatility(nodeObj.volatility);
    }
  }

  // fallback if no flag is set
  return "#92c5de";
}



function opt_no_of_nodes(community_count) {
	let range_for_same_point = -1;
	let next_range_for_same_point = 1;
	let part_of_sprial_considered_same = 7*12;
	let set_of_disticnt_ranges = new Set();
	let optimal_no_of_nodes = 0;

	while (range_for_same_point != next_range_for_same_point) {
		range_for_same_point = next_range_for_same_point;
		set_of_disticnt_ranges.add(range_for_same_point);
		let set_of_node_counts = new Set();
		community_count.forEach(function(d){
			set_of_node_counts.add(range_for_same_point*Math.floor(d.count/range_for_same_point));
		});
		var sum = 0;
		set_of_node_counts.forEach(function(num) { sum += num; });

		let average = Math.floor(sum / set_of_node_counts.size);
		next_range_for_same_point = Math.floor(average/part_of_sprial_considered_same);
		optimal_no_of_nodes = average;
		if (set_of_disticnt_ranges.has(next_range_for_same_point)) {
			break;
		}
	}
	return optimal_no_of_nodes;
}


// This array will hold [{ name: "...", id: 123 }, ...] from author_mapping.txt
let authorMappingArray = [];

function loadAuthorMapping() {
  d3.text("author_mapping.txt").then(function(text) {
    // Parse the text line by line
    // Each line typically looks like: "Abdo, H.: 0"
    let lines = text.split(/\r?\n/);
    
    authorMappingArray = []; // clear/initialize

    lines.forEach(line => {
      line = line.trim();
      if (!line) return; // skip empty lines

      // Example line structure: "Abdo, H.: 0"
      let parts = line.split(":");
      if (parts.length < 2) return;

      let authorName = parts[0].trim(); // "Abdo, H."
      let idString = parts[1].trim();   // "0"
      let nodeId = parseInt(idString);

      // Build the array
      authorMappingArray.push({
        name: authorName,
        id: nodeId
      });
    });

    // Now populate the <datalist> with these items
    populateDatalist(authorMappingArray);
  });
}

function populateDatalist(mapping) {
  // Get reference to the <datalist> element
  let dataList = document.getElementById("nodeAuthorList");
  dataList.innerHTML = ""; // clear old options if any

  mapping.forEach(item => {
    // We'll show "nodeId - authorName"
    let displayValue = item.id + " - " + item.name;

    let option = document.createElement("option");
    option.value = displayValue;
    dataList.appendChild(option);
  });
}

// Call this once the page loads so the dropdown is ready
window.onload = function() {
  loadAuthorMapping();  // or you can call it inside some other init function
};




function idled() {
  idleTimeout = null;
}

//
// The final function that triggers the main spiral layout
//

function showdata_spiral_community_chart(data){

  let svg = d3.select("#chart");
  let bounds = svg.node().getBoundingClientRect();
  let width = bounds.width;
  let height = bounds.height;
  initializeSpiralChart(svg, height, width);

  //coarse_graph_data
  coarse_graph_data = data[6];
  center_positions_spiral = string_to_numbers_graph_centers(coarse_graph_data);

  center_positions_spiral = transform_graph_centers(center_positions_spiral, height, width);
  center_positions_spiral.sort(function(a,b){return d3.ascending(a.community, b.community);});

  link_data = transform_link_data(data[2]);
  connections_list = data[4];
  extent_of_centralities_after_removing_outliers = data[5];
  optimal_no_of_nodes = opt_no_of_nodes(data[6]);

  node_to_node_link_data = transform_node_to_node_link_data(data[3]);

  // transform data from strings to integers
  data = transform_data(data[0]);

  // compute final x and y
  data = computing_spiral_positions(center_positions_spiral, data, height, width);
  global_data = data; // changes with interactions
  global_data_unchanged = data;
  global_data_sorted = data;
  global_data_sorted.sort(function(a,b){return d3.descending(a.node, b.node);});
  global_data = global_data_sorted;

  // example reordering by community & centrality
  let prepare_data = [];
  let unique_communities = new Set(global_data_unchanged.map(function(d){return d.community;}));
  unique_communities.forEach(function(entry) {
    let community_data = global_data_unchanged.filter(function(d){ return d.community == entry;});
    community_data.sort(function(a,b){return d3.descending(a.centrality,b.centrality);});
    prepare_data.push.apply(prepare_data, community_data);
  });

  prepare_data = computing_spiral_positions(center_positions_spiral, prepare_data, height, width);
  global_data = prepare_data;
  global_data_unchanged = prepare_data;

  draw_spiral_community();
}
