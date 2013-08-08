// Grab the initial JSON

var model_data = {}

$('a').on('click', function(e) {
    setTimeout(function(){
        makeVisibleSliders()
    }, 2);
});

$('a.inputFlow').on('click', function(e) {
    updateInputFlows($(this).attr('href'));
});

updateModel = function() {
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
            console.log(x.error())
        }
    })
}

updateModel()

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
    
    updateInputFlows(model_data['active_input'])
}

updateOutputs = function() {
    total_net = model_data['net_toa']
    $('#toa').text(Math.abs(total_net))
    $('#toa_sign').text(total_net < 0 ? 'losing' : 'gaining')
    updateOutputFlows()
}

makeVisibleSliders = function() {
    var blah = $('.addSlider:visible').slider().removeClass('addSlider')
    blah.addClass('slider').on('slideStop', function(e) {
        model_data[$(this).attr('name')] = parseFloat($(this).val())
        updateModel()
    });
}

makeVisibleSliders()

var svgHeight = 500
var svgWidth = 800
var chartHeight = 400
var inputWidth = 150
var verticalMargin = 60
var inputOutputMargin = 130
var leftMargin = 50
$('svg#flow').css('height', svgHeight + 2 * verticalMargin)
updateInputFlows = function(key) {
    model_data['active_input'] = typeof key !== 'undefined' ? key : '#pressure'
    
    args = {
        '#pressure': {
            max: 1500,
            values: [model_data['ps']].concat(model_data['lev']),
            label: 'pressure (mb)',
            surfaceKey: 'ps',
            nonSurfaceKey: 'lev'
        },
        '#temperature': {
            max: 400,
            values: [model_data['Ts']].concat(model_data['Tbound']),
            label: 'temperature (K)',
            surfaceKey: 'Ts',
            nonSurfaceKey: 'Tbound'
        },
        '#co2': {
            max: 1000,
            values: [model_data['co2'][0]].concat(model_data['co2']),
            label: 'CO2 (ppm)',
            surfaceKey: false,
            nonSurfaceKey: 'co2'
        },
        '#ch4': {
            max: 10000,
            values: [model_data['ch4'][0]].concat(model_data['ch4']),
            label: 'CH4 (ppb)',
            surfaceKey: false,
            nonSurfaceKey: 'ch4'
        },
        '#n2o': {
            max: 1000,
            values: [model_data['n2o'][0]].concat(model_data['n2o']),
            label: 'N2O (ppb)',
            surfaceKey: false,
            nonSurfaceKey: 'n2o'
        },
        '#h2o': {
            max: 0.05,
            values: [model_data['h2o'][0]].concat(model_data['h2o']),
            label: 'H2O',
            surfaceKey: false,
            nonSurfaceKey: 'h2o'
        },
        '#cfc11': {
            max: 1000,
            values: [model_data['cfc11'][0]].concat(model_data['cfc11']),
            label: 'CFC-11 (ppt)',
            surfaceKey: false,
            nonSurfaceKey: 'cfc11'
        },
        '#cfc12': {
            max: 1000,
            values: [model_data['cfc12'][0]].concat(model_data['cfc12']),
            label: 'CFC-12 (ppt)',
            surfaceKey: false,
            nonSurfaceKey: 'cfc12'
        },
        '#cfc22': {
            max: 1000,
            values: [model_data['cfc22'][0]].concat(model_data['cfc22']),
            label: 'CFC-22 (ppt)',
            surfaceKey: false,
            nonSurfaceKey: 'cfc22'
        },
        '#o3': {
            max: 50,
            values: [model_data['o3'][0]].concat(model_data['o3']),
            label: 'O3 (ppm)',
            surfaceKey: false,
            nonSurfaceKey: 'o3'
        },
        '#ccl4': {
            max: 50,
            values: [model_data['ccl4'][0]].concat(model_data['ccl4']),
            label: 'CCl4 (ppt)',
            surfaceKey: false,
            nonSurfaceKey: 'ccl4'
        },
        '#cldf': {
            max: 1,
            hardMax: true,
            values: [model_data['cldf'][0]].concat(model_data['cldf']),
            label: 'Cloud fraction',
            surfaceKey: false,
            nonSurfaceKey: 'cldf'
        },
        '#clwp': {
            max: 30,
            values: [model_data['clwp'][0]].concat(model_data['clwp']),
            label: 'In-cloud liquid water path (g/m^2)',
            surfaceKey: false,
            nonSurfaceKey: 'clwp'
        },
        '#ciwp': {
            max: 30,
            values: [model_data['ciwp'][0]].concat(model_data['ciwp']),
            label: 'In-cloud ice water path (g/m^2)',
            surfaceKey: false,
            nonSurfaceKey: 'ciwp'
        },
        '#r_liq': {
            max: 100,
            values: [model_data['r_liq'][0]].concat(model_data['r_liq']),
            label: 'Cloud water drop radius (10^-6 m)',
            surfaceKey: false,
            nonSurfaceKey: 'clwp'
        },
        '#r_ice': {
            min: 13,
            max: 130,
            hardMax: true,
            values: [model_data['r_ice'][0]].concat(model_data['r_ice']),
            label: 'Cloud ice particle radius (10^-6 m)',
            surfaceKey: false,
            nonSurfaceKey: 'r_ice'
        },
        '#tauaer_sw': {
            max: 3,
            values: [model_data['tauaer_sw'][0]].concat(model_data['tauaer_sw']),
            label: 'Aerosol shortwave optical depth',
            surfaceKey: false,
            nonSurfaceKey: 'tauaer_sw'
        },
        '#ssaaer_sw': {
            max: 1,
            hardMax: true,
            values: [model_data['ssaaer_sw'][0]].concat(model_data['ssaaer_sw']),
            label: 'Aerosol shortwave single-scattering albedo',
            surfaceKey: false,
            nonSurfaceKey: 'ssaaer_sw'
        },
        '#asmaer_sw': {
            min: -1,
            max: 1,
            hardMax: true,
            values: [model_data['asmaer_sw'][0]].concat(model_data['asmaer_sw']),
            label: 'Aerosol shortwave asymmetric scattering',
            surfaceKey: false,
            nonSurfaceKey: 'asmaer_sw'
        },
        '#tauaer_lw': {
            max: 3,
            values: [model_data['tauaer_lw'][0]].concat(model_data['tauaer_lw']),
            label: 'Aerosol longwave optical depth (absorption only)',
            surfaceKey: false,
            nonSurfaceKey: 'tauaer_lw'
        }
    }[model_data['active_input']];
    var vis = d3.select('#flow')
    
    d3.select('g.input').remove()
    var g = vis.append("svg:g")
        .attr('class', 'input').attr('transform', 'translate(' + leftMargin + ', ' + verticalMargin + ')');
    var height = chartHeight
    
    var x = d3.scale.linear().domain([args.min || 0, args.max]).range([0, inputWidth])
    var y = d3.scale.linear().domain([0, d3.max(model_data['altitude'])]).range([height, 0])
    var line = d3.svg.line().x(function(d) { return x(d); }).y(function(d,i) { return y(i && model_data['altitude'][i - 1]); })
    
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

    g.append("svg:line")
        .attr("x1", 0)
        .attr("y1", height)
        .attr("x2", 800)
        .attr("y2", height)
    
    g.append("svg:line").attr("x1", 0).attr("y1", 0).attr("x2", 800).attr("y2", 0)

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
                model_data[args.surfaceKey] = newValue
            } else {
                if ((key == '#cldf') && (model_data[args.nonSurfaceKey][ci - 1] == 0)) {
                    $.each([['clwp', 5.0], ['ciwp', 5.0], ['r_liq', 10.0], ['r_ice', 30.0]], function(i,d) {
                        var new_key = d[0]
                        var new_default = d[1]
                        
                        if (model_data[new_key][ci - 1] == 0) {
                            model_data[new_key][ci - 1] = new_default
                        }
                    })
                }
                model_data[args.nonSurfaceKey][ci - 1] = newValue
            }
            changed = true
        }
    })
}

closestLayerIndex = function(altitude) {
    var closest = 0
    var previous = 0
    $.each(model_data['altitude'], function(i,d) {
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
            return data[0].map(function(d,i) { return - d[1] });
        }

        var layers = d3.layout.stack().offset(offset)([downLayer, upLayer]);

        var x = d3.scale.linear()
             .domain([-maxFlux, maxFlux]).range([ 
                 i * (subsectionWidth + subsectionMargin),
                 i * (subsectionWidth + subsectionMargin) + subsectionWidth
            ]);


        var y = d3.scale.linear().domain([0, d3.max(model_data['altitude'])]).range([height, 0])
         // 
         // var y = d3.scale.linear()
         //     .domain([0, downLayer.length - 1])
         //     .range([height, 0]);

          var area = d3.svg.area()
              .x0(function(d) { return x(d.y0); })
              .x1(function(d) { return x(d.y0 + d.y); })
              .y(function(d,i) { return y(i && model_data['altitude'][i - 1]); });

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
        
    
                              // add labels
                          // g.append('text')
                          // .attr('class', 'x label')
                          // .attr('text-anchor', 'middle')
                          // .attr('x', leftExtent - 30)
                          // .attr('y', height + 30)
                          // .text('down');
                          // 
                          // g.append('text')
                          // .attr('class', 'x label')
                          // .attr('text-anchor', 'middle')
                          // .attr('x', leftExtent + 30)
                          // .attr('y', height + 30)
                          // .text('up');
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
//.header("Content-Type","application/x-www-form-urlencoded")
// .send("POST","a=b");