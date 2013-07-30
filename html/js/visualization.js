// Grab the initial JSON

var model_data = {}

$('a[data-toggle="tab"]').on('shown', function (e) {
    makeVisibleSliders()
})

updateResults = function() {
    $.ajax({
        url: '../cgi-bin/rrtm.py',
        type: 'post',
        data: JSON.stringify(model_data),
        // data: JSON.stringify(rrtm_data['input']),
        dataType: 'json',
        success: function(response) {
            model_data = response
            updateInputs()
            updateOutputs()
        },
        error: function(x,s,e) {
            console.log(x)
        }
    })
}

updateResults()

updateInputs = function() {
    $.each(model_data, function(key, value) {
        switch(typeof(value)){
            case 'number':
                $('input[name="' + key + '"]').attr('value', value)
                break;
            case 'object':
                $('input[name="' + key + '"]').attr('value', value[0])                
                break;
        }
    })
    
    updateInputFlows('lev', model_data['lev'])
}

updateOutputs = function() {
    total_net = model_data['net_toa']
    $('#toa').text(Math.abs(total_net))
    $('#toa_sign').text(total_net < 0 ? 'losing' : 'gaining')
    updateOutputFlows()
}

makeVisibleSliders = function() {
    $('.addSlider:visible').slider().removeClass('addSlider').addClass('slider').on('slideStop', function(e) {
        console.log($(this).val())
        model_data[$(this).attr('name')] = parseInt($(this).val())
       updateResults()
    });
}

makeVisibleSliders()

var svgHeight = 500
var chartHeight = 400
var inputWidth = 150
var verticalMargin = 50
var inputOutputMargin = 100
updateInputFlows = function(name, values) {
    var vis = d3.select('#flow')
    
    d3.select('g.input').remove()
    var g = vis.append("svg:g")
        .attr('class', 'input')
        .attr('transform', 'translate(50, ' + verticalMargin + ')');
    var height = chartHeight,
        data_max = 0
    switch(name){
        case 'lev':
            data_max = 1500.
            break;
        case 'Tbound':
            data_max = 400.
            break;
    }
    
    var x = d3.scale.linear().domain([0, data_max]).range([0, inputWidth])
    var y = d3.scale.linear().domain([0, d3.max(model_data['altitude'])]).range([height, 0])
    var line = d3.svg.line().x(function(d) { return x(d); }).y(function(d,i) { return y(i && model_data['altitude'][i - 1]); })
    
    g.append('svg:path').attr('d', line([model_data['ps']].concat(values)))
    
    // add axes
        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .ticks(5);
        
        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('left')
            .ticks(5)

        g.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis)
        
        g.append('g')
            .attr('class', 'axis')
            .call(yAxis)
    
        g.append("svg:line")
            .attr("x1", 0)
            .attr("y1", height)
            .attr("x2", 880)
            .attr("y2", height)
        
        g.append("svg:line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 880)
            .attr("y2", 0)
    
            // add labels
            
        g.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('x', inputWidth / 2)
        .attr('y', height + 30)
        .text('pressure (mb)')
        
        g.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'middle')
        .attr('y', -35)
        .attr('x', -height / 2)
        .attr('dy', '.75em')
        .attr('transform', 'rotate(-90)')
        .text('altitude (km)')
}

updateOutputFlows = function() {
    var vis = d3.select('#flow')
    
    d3.select('g.output').remove()
    var g = vis.append("svg:g")
        .attr('class', 'output')
        .attr('transform', 'translate(' + (inputWidth + inputOutputMargin) + ', ' + verticalMargin + ')');
        
    // Set sizes of things
    var width = 700,
        height = chartHeight,
        arrowHeight = 50,
        arrowHeadHeight = 30,
        arrowHeadExtraWidthDefault = 20,
        subsectionWidth = 200,
        subsectionMargin = 20,
        maxFlux = 1500;

    var list = ['shortwave', 'longwave', 'total']
    var json = {
        'shortwave': {
            'downward': model_data['swdflx'],
            'upward': model_data['swuflx']
        },
        'longwave': {
            'downward': model_data['lwdflx'],
            'upward': model_data['lwuflx']
        },
        'total': {
            'downward': model_data['dflx'],
            'upward': model_data['uflx']
        }
    }
    
    list.map(function(lightType,i) {
        var downLayer = json[lightType].downward.map(function(d, i) {return {x: i, y: d}});
        var upLayer = json[lightType].upward.map(function(d, i) {return {x: i, y: d}});            
        offset = function(data) {
            var ymax = maxFlux // d3.max(data[0], function(d) { return d[1]})
            return data[0].map(function(d,i) { return ymax - d[1] });
        }

        var layers = d3.layout.stack().offset(offset)([downLayer, upLayer]);

        var x = d3.scale.linear()
             .domain([0, 2 * maxFlux]).range([ 
                 i * (subsectionWidth + subsectionMargin),
                 i * (subsectionWidth + subsectionMargin) + subsectionWidth
            ]);

         var y = d3.scale.linear()
             .domain([0, downLayer.length - 1])
             .range([height, 0]);

          var area = d3.svg.area()
              .x0(function(d) { return x(d.y0); })
              .x1(function(d) { return x(d.y0 + d.y); })
              .y(function(d) { return y(d.x); });

          g.selectAll("path." + lightType)
              .data(layers)
            .enter().append("path")
              .attr("d", area)
              .attr('class', lightType)
              .style("fill", function(d, i) { return ['rgb(249,152,0)', 'rgb(228,105,0)'][i]; });

              // Arrows
              var leftExtent = x(layers[0][0].y0)
              var rightExtent = x(layers[0][0].y0 + layers[0][0].y)
            var arrowHeadExtraWidth = d3.min([rightExtent - leftExtent, arrowHeadExtraWidthDefault]) // arrowHeadExtraWidthDefault
              var downArrowPoints = [
                  {'x': leftExtent, 'y': height-arrowHeight+verticalMargin},
                  {'x': leftExtent, 'y': height-arrowHeadHeight+verticalMargin},
                  {'x': leftExtent - arrowHeadExtraWidth, 'y': height-arrowHeadHeight+verticalMargin},
                  {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': height+verticalMargin},
                  {'x': rightExtent + arrowHeadExtraWidth, 'y': height-arrowHeadHeight+verticalMargin},
                  {'x': rightExtent, 'y': height-arrowHeadHeight+verticalMargin},
                  {'x': rightExtent, 'y': height-arrowHeight+verticalMargin}
              ]
              
              g.selectAll("polygon." + lightType + 'DownArrow')
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
                  var arrowHeadExtraWidth = d3.min([rightExtent - leftExtent, arrowHeadExtraWidthDefault]) // arrowHeadExtraWidthDefault 
                  var upArrowPoints = [
                      {'x': leftExtent, 'y': arrowHeight-verticalMargin},
                      {'x': leftExtent, 'y': arrowHeadHeight-verticalMargin},
                      {'x': leftExtent - arrowHeadExtraWidth, 'y': arrowHeadHeight-verticalMargin},
                      {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': 0-verticalMargin},
                      {'x': rightExtent + arrowHeadExtraWidth, 'y': arrowHeadHeight-verticalMargin},
                      {'x': rightExtent, 'y': arrowHeadHeight-verticalMargin},
                      {'x': rightExtent, 'y': arrowHeight-verticalMargin}
                  ]
              
                  g.selectAll("polygon." + lightType + 'UpArrow')
                      .data([upArrowPoints])
                    .enter().append("polygon")
                      .attr("points",function(d) { 
                          return d.map(function(d) {
                              return [d.x,d.y].join(",");
                          }).join(" ");
                      })
                      .style("fill", 'rgb(228,105,0)')
                      .attr('class', lightType + 'UpArrow');
                      
                      // add axes
                          var xAxis = d3.svg.axis()
                              .scale(x)
                              .orient('bottom')
                              .ticks(5);
        
                          g.append('g')
                              .attr('class', 'axis')
                              .attr('transform', 'translate(0,' + height + ')')
                              .call(xAxis)
                              
                      var xTopAxis = d3.svg.axis()
                          .scale(x)
                          .orient('top')
                          .ticks(5);

                      g.append('g')
                          .attr('class', 'axis')
                          .attr('transform', 'translate(0,0)')
                          .call(xAxis)
        
    
                              // add labels
            
                          // g.append('text')
                          // .attr('class', 'x label')
                          // .attr('text-anchor', 'middle')
                          // .attr('x', inputWidth / 2)
                          // .attr('y', height + 30)
                          // .text('pressure (mb)')
    })
}
//.header("Content-Type","application/x-www-form-urlencoded")
// .send("POST","a=b");