// Grab the initial JSON

model_data = {
    'input': {}
}

updateResults = function() {
    $.ajax({
        url: '../cgi-bin/rrtm.py',
        type: 'post',
        data: JSON.stringify(model_data['input']),
        // data: JSON.stringify(rrtm_data['input']),
        dataType: 'json',
        success: function(response) {
            model_data['output'] = response
            updateVisualization()
        }
    })
}

updateVisualization = function() {
    total_net = model_data['output']['net_toa']
    $('#toa').text(Math.abs(total_net))
    $('#toa_sign').text(total_net < 0 ? 'losing' : 'gaining')
}

$('.slider').slider().on('slideStop', function(e) {
    console.log($(this).val())
    model_data['input'][$(this).attr('name')] = parseInt($(this).val())
   updateResults()
});



updatechart = function() {
    var atmosphere = d3.select('select')[0][0].options[d3.select('select')[0][0].selectedIndex].value;
    d3.json('../cgi-bin/rrtm.py?atmosphere=' + atmosphere, function(error, json) {
	    if (error) return console.warn(error);
        
        setupStreams(json, ['shortwave', 'longwave', 'total']);
    })
}

setupStreams = function(json, list) {
    
     d3.select('svg').remove()
     

     var width = 700,
         height = 470,
         arrowHeight = 50,
         arrowHeadHeight = 30,
         arrowHeadExtraWidth = 20;

     var svg = d3.select("#paired-line-chart").append("svg")
         .attr("width", width)
         .attr("height", height);

         var unadjustedWidths = list.map(function(lightType){
             return d3.max(json[lightType].downward) + d3.max(json[lightType].upward);
         });
         var widths = unadjustedWidths.map(function(d,i) {return d * width / d3.sum(unadjustedWidths)});
    list.map(function(lightType,i) {
        var downLayer = json[lightType].downward.map(function(d, i) {return {x: i, y: d}});
        var upLayer = json[lightType].upward.map(function(d, i) {return {x: i, y: d}});            
        offset = function(data) {
            var j = -1,
            m = data[0].length,
            ymax = d3.max(data[0], function(d) { return d[1]}),
            y0 = [];
            return data[0].map(function(d,i) { return ymax - d[1] });
        }

        var layers = d3.layout.stack().offset(offset)([downLayer, upLayer]);

        var xmax = d3.max(layers, function(layer) {return d3.max(layer, function(d) { return d.y0 + d.y; }); });
        var x = d3.scale.linear()
             .domain([0, xmax]).range([ 
                 d3.sum(widths.slice(0,i)),
                 d3.sum(widths.slice(0,i)) + widths[i] - 100 // the minus 20 creates a margin
            ]);

         var y = d3.scale.linear()
             .domain([0, downLayer.length - 1])
             .range([height - arrowHeight, arrowHeight]);

          var area = d3.svg.area()
              .x0(function(d) { return x(d.y0); })
              .x1(function(d) { return x(d.y0 + d.y); })
              .y(function(d) { return y(d.x); });

          svg.selectAll("path." + lightType)
              .data(layers)
            .enter().append("path")
              .attr("d", area)
              .attr('class', lightType)
              .style("fill", function(d, i) { return ['rgb(249,152,0)', 'rgb(228,105,0)'][i]; });

              // Arrows
              var leftExtent = x(layers[0][0].y0)
              var rightExtent = x(layers[0][0].y0 + layers[0][0].y)
              var downArrowPoints = [
                  {'x': leftExtent, 'y': height-arrowHeight},
                  {'x': leftExtent, 'y': height-arrowHeadHeight},
                  {'x': leftExtent - arrowHeadExtraWidth, 'y': height-arrowHeadHeight},
                  {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': height},
                  {'x': rightExtent + arrowHeadExtraWidth, 'y': height-arrowHeadHeight},
                  {'x': rightExtent, 'y': height-arrowHeadHeight},
                  {'x': rightExtent, 'y': height-arrowHeight}
              ]
              
              svg.selectAll("polygon." + lightType + 'DownArrow')
                  .data([downArrowPoints])
                .enter().append("polygon")
                  .attr("points",function(d) { 
                      return d.map(function(d) {
                          return [d.x,d.y].join(",");
                      }).join(" ");
                  })
                  .style("fill", 'rgb(249,152,0)')
                  .attr('class', lightType + 'DownArrow');
        
                  var leftExtent = x(layers[1][layers[1].length-1].y0)
                  var rightExtent = x(layers[1][layers[1].length-1].y0 + layers[1][layers[1].length-1].y)
                  var upArrowPoints = [
                      {'x': leftExtent, 'y': arrowHeight},
                      {'x': leftExtent, 'y': arrowHeadHeight},
                      {'x': leftExtent - arrowHeadExtraWidth, 'y': arrowHeadHeight},
                      {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': 0},
                      {'x': rightExtent + arrowHeadExtraWidth, 'y': arrowHeadHeight},
                      {'x': rightExtent, 'y': arrowHeadHeight},
                      {'x': rightExtent, 'y': arrowHeight}
                  ]
              
                  svg.selectAll("polygon." + lightType + 'UpArrow')
                      .data([upArrowPoints])
                    .enter().append("polygon")
                      .attr("points",function(d) { 
                          return d.map(function(d) {
                              return [d.x,d.y].join(",");
                          }).join(" ");
                      })
                      .style("fill", 'rgb(228,105,0)')
                      .attr('class', lightType + 'UpArrow');
    })
}
//.header("Content-Type","application/x-www-form-urlencoded")
// .send("POST","a=b");