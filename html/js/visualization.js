// ==============
// = Model Data =
// ==============

var modelData = {}

// AJAX call to update modelData object,
// inputs, and visualization
updateModel = function() {
    $.ajax({
        url: '../cgi-bin/rrtm.py',
        type: 'post',
        data: JSON.stringify(modelData),
        dataType: 'json',
        success: function(response) {
            modelData = response
            updateInputs()
            updateOutputs()
        },
        error: function(x,s,e) {
            console.log(x.error())
        }
    })
}

updateModel()

// ===========
// = Sliders =
// ===========

$('a').on('click', function(e) {
    // Delay seems to be necessary
    setTimeout(function(){
        makeVisibleSliders()
    }, 2);
});

makeVisibleSliders = function() {
    $('.addSlider:visible').slider().removeClass('addSlider').addClass('slider').on('slideStop', function(e) {
        modelData[$(this).attr('name')] = parseFloat($(this).val())
        updateModel()
    });
}

makeVisibleSliders()


$('a.inputFlow').on('click', function(e) {
    updateInputFlows($(this));
});

updateInputs = function() {
    $.each(modelData, function(key, value) {
        switch(typeof(value)){
            case 'number':
                $('input[name="' + key + '"]').attr('value', value)
                break;
            case 'object':
                $('input[name="' + key + '"]').attr('value', value[0])                
                break;
        }
    })
    
    updateInputFlows($('a[href="' + modelData['active_input'] + '"]'))
}

updateOutputs = function() {
    total_net = modelData['net_toa']
    $('#toa').text(Math.abs(total_net))
    $('#toa_sign').text(total_net < 0 ? 'losing' : 'gaining')
    updateOutputFlows()
}

var svg = $('svg#flow')
var svgHeight = 500
var svgWidth = 1200
var chartHeight = 400
var inputWidth = 150
var verticalMargin = 60
var inputOutputMargin = 130
var leftMargin = 50
svg.css('height', svgHeight + 2 * verticalMargin)
svg.css('width', svgWidth + 2 * verticalMargin)
updateInputFlows = function(link) {
    // Look up which parameter we're messing with
    // alert('wait')
    var key = link.attr('href')
    
    // set the current active input so that it isn't overwritten when
    // we get the returned value; this can be done less hacky
    modelData['active_input'] = key

    // grab te data for the link
    var args = {
        nonSurfaceKey: key.slice(1),
        values: ([typeof link.attr('data-surfaceKey') !== 'undefined' ? modelData[link.attr('data-surfaceKey')] : modelData[key.slice(1)][0]]).concat(modelData[args.nonSurfaceKey]),
        max: link.attr('data-max'),
        min: link.attr('data-min'),
        hardMax: link.attr('data-hardMax') == 'true',
        label: link.attr('data-label')
    }
    
    
    var vis = d3.select('svg#flow')
    d3.select('g.input').remove()
    var g = vis.append("svg:g")
        .attr('class', 'input').attr('transform', 'translate(' + leftMargin + ', ' + verticalMargin + ')');
    var height = chartHeight
    
    var x = d3.scale.linear().domain([args.min || 0, args.max]).range([0, inputWidth])
    var y = d3.scale.linear().domain([0, d3.max(modelData['altitude'])]).range([height, 0])
    var line = d3.svg.line().x(function(d) { return x(d); }).y(function(d,i) { return y(i && modelData['altitude'][i - 1]); })
    
    var profile = g.append('svg:path').attr('d', line(args.values))
    
    // add axes
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(5)
        .tickFormat(function(d) {return d});
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(5)
        
    var yRightAxis = d3.svg.axis()
        .scale(y)
        .orient('right')
        .ticks(5)

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis)
    
    g.append('g')
        .attr('class', 'axis')
        .call(yAxis)
    
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + 800 + ',0)')
        .call(yRightAxis)
        // add labels
        
    g.append('text')
    .attr('class', 'x label')
    .attr('text-anchor', 'middle')
    .attr('x', inputWidth / 2)
    .attr('y', height + 30)
    .text(args.label)
    
    g.append('text')
    .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', -35)
    .attr('x', -height / 2).attr('dy', '.75em').attr('transform', 'rotate(-90)')
    .text('altitude (km)')
    
    g.append('text')
    .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', -835)
    .attr('x', height / 2).attr('dy', '.75em').attr('transform', 'rotate(90)')
    .text('altitude (km)')
    
    vis.on("mousemove", null)
    vis.on("mousemove", function(d,i) {
        if (mouseDown) {
            var ci = closestLayerIndex(y.invert(d3.mouse(this)[1] - verticalMargin))
            if (args.hardMax) {
                var newValue = x.invert(Math.min(Math.max(d3.mouse(this)[0] - leftMargin, 0), inputWidth))
            } else {
                var newValue = x.invert(Math.max(d3.mouse(this)[0] - leftMargin, 0))                
            }

            args.values[ci] = newValue
            profile.remove()
            profile = g.append('svg:path').attr('d', line(args.values))
            if ((args.surfaceKey) && (ci == 0)) {
                modelData[args.surfaceKey] = newValue
            } else {
                if ((key == '#cldf') && (modelData[args.nonSurfaceKey][ci - 1] == 0)) {
                    $.each([['clwp', 5.0], ['ciwp', 5.0], ['r_liq', 10.0], ['r_ice', 30.0]], function(i,d) {
                        var new_key = d[0]
                        var new_default = d[1]
                        
                        if (modelData[new_key][ci - 1] == 0) {
                            modelData[new_key][ci - 1] = new_default
                        }
                    })
                }
                modelData[args.nonSurfaceKey][ci - 1] = newValue
            }
            changed = true
        }
    })
}

closestLayerIndex = function(altitude) {
    var closest = 0
    var previous = 0
    $.each(modelData['altitude'], function(i,d) {
        if (altitude < (previous + (d - previous) / 2)) {
            return false
        } else {
            closest = i
            previous = d
        }
    })
    return closest
}

var mouseDown = false
var changed = false
$('svg').on("mousedown", function(e) {
    mouseDown = true
})
$('body').on("mouseup", function(e) {
    mouseDown = false
    if (changed) {
        updateModel()
        changed = false
    }
})

updateOutputFlows = function() {
    var vis = d3.select('#flow')
    
    d3.select('g.output').remove()
    var g = vis.append("svg:g")
        .attr('class', 'output')
        .attr('transform', 'translate(' + (inputWidth + inputOutputMargin) + ', ' + verticalMargin + ')');
        
    // Set sizes of things
    var width = 700,
        height = chartHeight,
        arrowHeight = 40, // 60,
        arrowHeadHeight = 15,
        arrowHeadExtraWidthDefault = 20,
        subsectionWidth = 150,
        subsectionMargin = 50,
        maxFlux = 1000;

    var list = ['shortwave', 'longwave', 'total']
    var json = {
        'shortwave': {
            'downward': modelData['swdflx'],
            'upward': modelData['swuflx']
        },
        'longwave': {
            'downward': modelData['lwdflx'],
            'upward': modelData['lwuflx']
        },
        'total': {
            'downward': modelData['dflx'],
            'upward': modelData['uflx']
        }
    }
    
    list.map(function(lightType,i) {
        var downLayer = json[lightType].downward.map(function(d, i) {return {x: i, y: d}});
        var upLayer = json[lightType].upward.map(function(d, i) {return {x: i, y: d}});            
        offset = function(data) {
            var ymax = maxFlux // d3.max(data[0], function(d) { return d[1]})
            return data[0].map(function(d,i) { return - d[1] });
        }

        var layers = d3.layout.stack().offset(offset)([downLayer, upLayer]);

        var x = d3.scale.linear()
             .domain([-maxFlux, maxFlux]).range([ 
                 i * (subsectionWidth + subsectionMargin),
                 i * (subsectionWidth + subsectionMargin) + subsectionWidth
            ]);


        var y = d3.scale.linear().domain([0, d3.max(modelData['altitude'])]).range([height, 0])
         // 
         // var y = d3.scale.linear()
         //     .domain([0, downLayer.length - 1])
         //     .range([height, 0]);

          var area = d3.svg.area()
              .x0(function(d) { return x(d.y0); })
              .x1(function(d) { return x(d.y0 + d.y); })
              .y(function(d,i) { return y(i && modelData['altitude'][i - 1]); });

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
                  {'x': leftExtent, 'y': height}, //+verticalMargin-arrowHeight},
                  {'x': leftExtent, 'y': height-arrowHeadHeight+arrowHeight},
                  {'x': leftExtent - arrowHeadExtraWidth, 'y': height-arrowHeadHeight+arrowHeight},
                  {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': height+arrowHeight},
                  {'x': rightExtent + arrowHeadExtraWidth, 'y': height-arrowHeadHeight+arrowHeight},
                  {'x': rightExtent, 'y': height-arrowHeadHeight+arrowHeight},
                  {'x': rightExtent, 'y': height} //-arrowHeight+verticalMargin}
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
                      {'x': leftExtent, 'y': 0},
                      {'x': leftExtent, 'y': arrowHeadHeight-arrowHeight},
                      {'x': leftExtent - arrowHeadExtraWidth, 'y': arrowHeadHeight-arrowHeight},
                      {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': -arrowHeight},
                      {'x': rightExtent + arrowHeadExtraWidth, 'y': arrowHeadHeight-arrowHeight},
                      {'x': rightExtent, 'y': arrowHeadHeight-arrowHeight},
                      {'x': rightExtent, 'y': 0}
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
                              .ticks(5)
                              .tickFormat(function(d) {return Math.abs(d)});
        
                          g.append('g')
                              .attr('class', 'axis')
                              .attr('transform', 'translate(0,' + height + ')')
                              .call(xAxis)
                              
                      var xTopAxis = d3.svg.axis()
                          .scale(x)
                          .orient('top')
                          .ticks(5)
                        .tickFormat(function(d) {return Math.abs(d)});

                      g.append('g')
                          .attr('class', 'axis')
                          .attr('transform', 'translate(0,0)')
                          .call(xTopAxis)

                          g.append('text')
                          .attr('class', 'x label')
                          .attr('text-anchor', 'middle')
                          .attr('x', leftExtent)
                          .attr('y', -47) //23)
                          .text(lightType + ' energy (W/m^2)');

                          g.append('text')
                          .attr('class', 'x label')
                          .attr('text-anchor', 'middle')
                          .attr('x', leftExtent)
                          .attr('y', height + 50) // 30)
                          .text(lightType + ' energy (W/m^2)');
    })
}
