// ===================
// = Style Variables =
// ===================
var svgDims = {
    altitudeAxis: 40,
    headerHeight: 60,
    flowHeight: 320,
    bottomMargin: 60,
    outputWidth: 400
}
$('svg#rrtm').height(svgDims.headerHeight + svgDims.flowHeight + svgDims.bottomMargin)

var totalWidth = 1250
$('svg#rrtm').width(700)

// ==========
// = Loader =
// ==========
// var foreignLoader = $($.grep($('foreignObject'), function( e, i) { return $(e).attr('class') == 'loader' })[0])
// foreignLoader.attr('y', headerHeight + flowHeight/2 - 20).attr('x', totalWidth / 2).attr('width',30).attr('height', 30)
// $('#loader').attr('width', 30).attr('height', 30)

var arrowHeight = 40 // 60
var arrowHeadHeight = 15
var arrowHeadExtraWidthDefault = 20
var maxFlux = 500

// ==============
// = Model Data =
// ==============

var modelData = {}

// AJAX call to update modelData object,
// inputs, and visualization
updateFlows = function(initialize) {
    if (initialize != true) {
        $('#loader').show()        
    }

    
    $.ajax({
        url: '../../cgi-bin/rrtm/rrtm.py',
        type: 'post',
        data: JSON.stringify(modelData),
        dataType: 'json',
        success: function(response) {
            modelData = response
            
            updateOutput()
            if (initialize == true) {
                initializeInput()
            } else {
                $('#loader').hide()
            }
        },
        error: function(x,s,e) {
            console.log(x.error())
        }
    })
}

updateFlows(true)

// ==========
// = Output =
// ==========
updateOutput = function() {
    var vis = d3.select('svg#rrtm')
    
    if (modelData['net_toa'] < 0) {
        var toa = '...then the Earth loses energy at a rate of ' + Math.abs(modelData['net_toa']) + ' W/m<sup>2</sup>.'
    } else {
        if (modelData['net_toa'] > 0) {
            var toa = '...then the Earth gains energy at a rate of ' + Math.abs(modelData['net_toa']) + ' W/m<sup>2</sup>.'
        } else {
            var toa = "...then the Earth loses as much energy as it gains."
        }
    }
    $('span#toa').html(toa)
    
    d3.select('g.output').remove()
    var g = vis.append('svg:g')
        .attr('class', 'output')
        .attr('transform', 'translate(' + svgDims.altitudeAxis + ', ' + svgDims.headerHeight + ')')
    var list = ['shortwave', 'longwave', 'total']
    var json = {
        'shortwave': {
            'downward': modelData['swdflx'],
            'upward': modelData['swuflx'],
            'downwardColor': 'rgb(249,152,0)',
            'upwardColor': 'rgb(228,105,0)',
            'nickname': 'sunlight'
        },
        'longwave': {
            'downward': modelData['lwdflx'],
            'upward': modelData['lwuflx'],
            'downwardColor': 'rgb(203,77,38)', // 'rgb(54,94,150)',
            'upwardColor': 'rgb(165,55,54)', // 'rgb(12,15,91)'
            'nickname': "Earth's radiation"
        },
        'total': {
            'downward': modelData['dflx'],
            'upward': modelData['uflx'],
            'downwardColor': 'rgb(127,127,141)', // 'rgb(47,47,49)',
            'upwardColor': 'rgb(51,50,72)', // 'rgb(24,24,24)'
            'nickname': 'total radiation'
        }
    }
    var y = d3.scale.linear().domain([0, d3.max(modelData['altitude'])]).range([svgDims.flowHeight, 0])

    // list.map(function(lightType,i) {
    // create lists of objects...
    var offset = function(data) { 
        return data[0].map(function(d,i) { 
            return -(d[1] + data[1][i][1])
        });
    }
    var layers = d3.layout.stack().offset(offset)([
        json.shortwave.downward,
        json.longwave.downward,
        json.shortwave.upward,
        json.longwave.upward
    ].map(function(list) {return list.map(function(d, i) {return {x: i, y: d}}) }));
    var maxFlow = d3.max([d3.max(modelData['dflx']), d3.max(modelData['uflx'])]) * 1.1
    var x = d3.scale.linear().domain([-maxFlow, maxFlow]).range([0,svgDims.outputWidth]);

    var area = d3.svg.area()
        .x0(function(d) { return x(d.y0); })
        .x1(function(d) { return x(d.y0 + d.y); })
        .y(function(d,i) { return y(i && modelData['altitude'][i - 1]); });

    g.selectAll("path.total")
        .data(layers)
        .enter().append("path")
            .attr("d", area)
            .attr('class', 'total arrowBody')
            .style("fill", function(d, i) { return [json.total.downwardColor, json.total.upwardColor][i]; });

    // Arrows
    var leftExtent = x(layers[0][0].y0)
    var rightExtent = x(layers[0][0].y0 + layers[0][0].y)
    var arrowHeadExtraWidth = d3.min([rightExtent - leftExtent, arrowHeadExtraWidthDefault]) // arrowHeadExtraWidthDefault
    var downArrowPoints = [
        {'x': leftExtent, 'y': svgDims.flowHeight}, //+verticalMargin-arrowHeight},
        {'x': leftExtent, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': leftExtent - arrowHeadExtraWidth, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': leftExtent + (rightExtent - leftExtent) / 2, 'y': svgDims.flowHeight+arrowHeight},
        {'x': rightExtent + arrowHeadExtraWidth, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': rightExtent, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': rightExtent, 'y': svgDims.flowHeight} //-arrowHeight+verticalMargin}
    ]

    g.selectAll("polygon.totalDownArrow")
        .data([downArrowPoints])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [d.x,d.y].join(",");
                }).join(" ");
            })
            .style("fill", json.total.downwardColor)
            .attr('class', 'totalDownArrow downArrow')
            .attr('data-size', layers[0][0].y);
                  
        
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
              
    g.selectAll("polygon.totalUpArrow")
        .data([upArrowPoints])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [d.x,d.y].join(",");
                }).join(" ");
            })
            .attr('data-size', layers[1][layers[1].length-1].y)
            .style("fill", json.total.upwardColor)
            .attr('class', 'totalUpArrow upArrow');
                      
    // add axes
    var xAxis = d3.svg.axis()
          .scale(x)
          .orient('bottom')
          .tickFormat(function(d) {return Math.abs(d)});

    g.append('g')
          .attr('class', 'axis')
          .attr('transform', 'translate(0,' + svgDims.flowHeight + ')')
          .call(xAxis)

    var xTopAxis = d3.svg.axis()
        .scale(x)
        .orient('top')
        .tickFormat(function(d) {return Math.abs(d)});

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,0)')
        .call(xTopAxis)

                      // g.append('text')
                      // .attr('class', 'x label')
                      // .attr('text-anchor', 'middle')
                      // .attr('fill', '#434358')
                      // .attr('x', leftExtent)
                      // .attr('y', -47) //23)
                      // .text(json[lightType].nickname + ' (W/m2)');
                      // 
                      // g.append('text')
                      // .attr('class', 'x label')
                      // .attr('text-anchor', 'middle')
                      // .attr('fill', '#434358')
                      // .attr('x', leftExtent)
                      // .attr('y', svgDims.flowHeight + 50) // 30)
                      // .text(json[lightType].nickname + ' (W/m2)');
                      // 
                      // switch (lightType) {
                      // case 'shortwave':
                      //     g.append('text')
                      //     .attr('class', 'x label')
                      //     .attr('text-anchor', 'middle')
                      //     .attr('fill', '#434358')
                      //     .attr('x', leftExtent + 75)
                      //     .attr('y', -47) //23)
                      //     .text('+');
                      // 
                      //     g.append('text')
                      //     .attr('class', 'x label')
                      //     .attr('text-anchor', 'middle')
                      //     .attr('fill', '#434358')
                      //     .attr('x', leftExtent + 75)
                      //     .attr('y', svgDims.flowHeight + 50) // 30)
                      //     .text('+');
                      //     
                      //     break;
                      // case 'longwave':
                      //     g.append('text')
                      //     .attr('class', 'x label')
                      //     .attr('text-anchor', 'middle')
                      //     .attr('fill', '#434358')
                      //     .attr('x', leftExtent + 90)
                      //     .attr('y', -47) //23)
                      //     .text('=');
                      // 
                      //     g.append('text')
                      //     .attr('class', 'x label')
                      //     .attr('text-anchor', 'middle')
                      //     .attr('fill', '#434358')
                      //     .attr('x', leftExtent + 90)
                      //     .attr('y', svgDims.flowHeight + 50) // 30)
                      //     .text('=');
                      //     break;
                      // }
    
    $('.downArrow, .upArrow').tooltip({
        items: 'polygon.upArrow, polygon.downArrow',
        content: function() { return $(this).attr('data-size')},
        track: true
    })
    
    $('path.arrowBody').tooltip({
        items: 'path.arrowBody',
        content: function() { return '-'}, // $(this).offset().top}, // return parseInt($(this).context.__data__[0].values[0]*10) / 10},
        track: true
    })
    
    $('path.arrowBody').mousemove(function(e) {
        var dataIndex = closestLayerIndex(y.invert(e.pageY - $(this).offset().top))
        $('.ui-tooltip-content').html(Math.round($(this).context.__data__[dataIndex].y * 10) / 10)
    })

}



// =========
// = Input =
// =========


var inputList = [
    {nonSurfaceKey: 'Tbound', surfaceKey: 'Ts', min: 220, max: 280, label: 'Temperature (K)'},
    {nonSurfaceKey: 'co2', max: 2000, label: 'CO2 (ppm)', double: 1},
    {nonSurfaceKey: 'ch4', max: 30000, label: 'CH4 (ppb)', double: 2},
    {nonSurfaceKey: 'cldf', max: 1, label: 'Cloud fraction', noCircle: true},
    {nonSurfaceKey: 'r_liq', max: 100, label: 'Cloud water drop radius (10^-6 m)'},
    {nonSurfaceKey: 'insoluble', max: 2, label: 'Organic aerosols (particles per cm^3)', noCircle: true},
    {nonSurfaceKey: 'water soluble', max: 100000, label: 'Sulfate aerosols (particles per cm^3)', noCircle: true},    
    {nonSurfaceKey: 'soot', max: 200000, label: 'Black carbon (particles per cm^3)', noCircle: true},
    {nonSurfaceKey: 'sea salt (acc.)', max: 30.0, label: 'Sea salt (particles per cm^3)', noCircle: true}
]

var checkedList = $.grep(inputList, function(el,ind) { return el.on})

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

// Set all inputs to their default values
$("input").val(function() { return $(this).attr("data-value")})
$("select option").filter(function() {
    return $(this).attr("data-selected") == "selected"; 
}).prop('selected', true);

initializeInput = function() {
    $('#loader').hide()
    
    if ($.browser.safari || $.browser.msie) {
        $('svg#rrtm').remove()
        $('div.container').html('This model is not supported by your browser. Please use <a href="http://www.mozilla.org/en-US/firefox/new/">Firefox</a> or <a href="https://www.google.com/intl/en/chrome/browser/">Chrome</a> instead.')
        return false
    } else {
        if ($.browser.webkit) {
             $('div.input').height(parseInt($('div.input').height()) + 10)               
        }
    }
    
    var y = d3.scale.linear().domain([0, d3.max(modelData['altitude'])]).range([svgDims.flowHeight, 0])
    
    // Axes
    var yRightAxis = d3.svg.axis()
        .scale(y)
        .orient('right')
        .ticks(5)
    
    var vis = d3.select('svg#rrtm')
    var g = vis.append("svg:g")
        .attr('class', 'input').attr('transform', 'translate(' + 0 + ', ' + svgDims.headerHeight + ')');

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(5)

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + svgDims.altitudeAxis + ',0)')
        .call(yAxis)

    g.append('text')
        .attr('fill', '#434358')
        .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', 0)
        .attr('x', -svgDims.flowHeight / 2).attr('dy', '.75em').attr('transform', 'rotate(-90)')
        .text('altitude (km)')

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + (svgDims.altitudeAxis + svgDims.outputWidth) + ',0)')
        .call(yRightAxis)

    g.append('text')
        .attr('fill', '#434358')
        .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', -(svgDims.outputWidth+(2*svgDims.altitudeAxis)))
        .attr('x', svgDims.flowHeight / 2).attr('dy', '.75em').attr('transform', 'rotate(90)')
        .text('altitude (km)')
    
    g.append('line')
        .attr("x1", svgDims.altitudeAxis)
        .attr("y1", 0)
        .attr("x2", svgDims.altitudeAxis)
        .attr("y2", svgDims.flowHeight)
        
    
    $("input, select[name='aerosols']").change(function() {
        if ($(this).attr("name") == "asdir") {
            $("select option").filter(function() {
                return $(this).text() == 'Custom albedo'; 
            }).prop('selected', true);
        }
        modelData[$(this).attr("name")] = $(this).val()
        updateFlows()
    })
    
    $("select[name='surface']").change(function() {
        if ($(this).val() != "custom") {
            $("input[name='asdir']").val($(this).val())
            modelData['asdir'] = $(this).val()
            updateFlows()            
        }
    })
}

updateClouds = function(cloudType, value) {
    var index = closestLayerIndex(cloudType == 'stratus' ? 1.0 : $('#tropopause').slider('value')) 

    $.each([['clwp', 5.0], ['ciwp', 5.0], ['r_liq', 10.0], ['r_ice', 30.0]], function(i,d) {
        var new_key = d[0]
        var new_default = d[1]
        if (modelData[new_key][index] == 0) { modelData[new_key][index] = new_default }
    })

    modelData['cldf'][index] = value / 100.0
}
