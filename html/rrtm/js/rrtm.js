// ===================
// = Style Variables =
// ===================
var svgDims = {
    altitudeAxis: 40,
    headerHeight: 60,
    flowHeight: 320,
    flowWidth: 350,
    bottomMargin: 60,
    betweenFlowAndProfile: 20,
    profileWidth: 200
}
$('svg#rrtm')
    .height(svgDims.headerHeight + svgDims.flowHeight + svgDims.bottomMargin)
    .width(svgDims.flowWidth + 4*svgDims.altitudeAxis + svgDims.profileWidth + svgDims.betweenFlowAndProfile)
// ==========
// = Loader =
// ==========
// var foreignLoader = $($.grep($('foreignObject'), function( e, i) { return $(e).attr('class') == 'loader' })[0])
// foreignLoader.attr('y', headerHeight + flowHeight/2 - 20).attr('x', totalWidth / 2).attr('width',30).attr('height', 30)
// $('#loader').attr('width', 30).attr('height', 30)

var arrowHeight = 60
var arrowHeadHeight = 40
var arrowHeadExtraWidthDefault = 20

// ==============
// = Model Data =
// ==============

var modelData = {}

// AJAX call to update modelData object,
// inputs, and visualization
updatePage = function(initialize) {
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
            updateFlows()
            updateProfile({
                xs: [modelData['Ts']].concat(modelData['Tbound']),
                ys: [0].concat(modelData['altitude'])
            })
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

updatePage(true)

// ==========
// = Output =
// ==========
updateFlows = function() {
    var vis = d3.select('svg#rrtm')
    
    if (modelData['net_toa'] < 0) {
        var toa = '...then it loses energy at a rate of ' + Math.abs(modelData['net_toa']) + ' W/m<sup>2</sup>.'
    } else {
        if (modelData['net_toa'] > 0) {
            var toa = '...then it gains energy at a rate of ' + Math.abs(modelData['net_toa']) + ' W/m<sup>2</sup>.'
        } else {
            var toa = "...then it loses as much energy as it gains."
        }
    }
    $('span#toa').html(toa)
    
    d3.select('g.output').remove()
    var g = vis.append('svg:g')
        .attr('class', 'output')
        .attr('transform', 'translate(' + svgDims.altitudeAxis + ', ' + svgDims.headerHeight + ')')
    var json = {
        'shortwave': {
            'downward': modelData['swdflx'],
            'upward': modelData['swuflx'],
            'color': 'rgb(249,152,0)',
            'nickname': 'sunlight'
        },
        'longwave': {
            'downward': modelData['lwdflx'],
            'upward': modelData['lwuflx'],
            'color': 'rgb(88,98,168)', // 'rgb(54,94,150)',
            'nickname': "Earth's radiation"
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
    var x = d3.scale.linear().domain([-maxFlow, maxFlow]).range([0,svgDims.flowWidth]);

    var area = d3.svg.area()
        .x0(function(d) { return x(d.y0); })
        .x1(function(d) { return x(d.y0 + d.y); })
        .y(function(d,i) { return y(i && modelData['altitude'][i - 1]); });

    g.selectAll("path.arrowBody")
        .data(layers)
        .enter().append("path")
            .attr("d", area)
            .attr('class', 'total arrowBody')
            .style("fill", function(d, i) { return [
                json.shortwave.color,
                json.longwave.color,
                json.shortwave.color,
                json.longwave.color
            ][i]; });

    // Arrows
    var left = x(layers[0][0].y0)
    var middle = x(layers[0][0].y0 + layers[0][0].y)
    var right = x(layers[0][0].y0 + layers[0][0].y + layers[1][0].y)
    var arrowHeadExtraWidth = d3.min([right - left, arrowHeadExtraWidthDefault]) // arrowHeadExtraWidthDefault
    var shortwaveDownArrowPoints = [
        {'x': left, 'y': svgDims.flowHeight}, //+verticalMargin-arrowHeight},
        {'x': left, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': left - arrowHeadExtraWidth, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': left + (right - left) / 2, 'y': svgDims.flowHeight+arrowHeight},
        {'x': middle, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': middle, 'y': svgDims.flowHeight} //-arrowHeight+verticalMargin}
    ]
    var longwaveDownArrowPoints = [
        {'x': middle, 'y': svgDims.flowHeight}, //+verticalMargin-arrowHeight},
        {'x': middle, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': left + (right - left) / 2, 'y': svgDims.flowHeight+arrowHeight},
        {'x': right + arrowHeadExtraWidth, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': right, 'y': svgDims.flowHeight-arrowHeadHeight+arrowHeight},
        {'x': right, 'y': svgDims.flowHeight} //-arrowHeight+verticalMargin}
    ]

    g.selectAll("polygon.shortwaveDownArrow")
        .data([shortwaveDownArrowPoints])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [d.x,d.y].join(",");
                }).join(" ");
            })
            .style("fill", json.shortwave.color)
            .attr('class', 'shortwaveDownArrow downArrow')
            .attr('data-size', layers[0][0].y);
            
    g.selectAll("polygon.longwaveDownArrow")
        .data([longwaveDownArrowPoints])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [d.x,d.y].join(",");
                }).join(" ");
            })
            .style("fill", json.longwave.color)
            .attr('class', 'longwaveDownArrow downArrow')
            .attr('data-size', layers[1][0].y);

       
    var lastIndex = layers[2].length-1
    var left = x(layers[2][lastIndex].y0)
    var middle = x(layers[2][lastIndex].y0 + layers[2][lastIndex].y)
    var right = x(layers[2][lastIndex].y0 + layers[2][lastIndex].y + layers[3][lastIndex].y)
    var arrowHeadExtraWidth = d3.min([right - left, arrowHeadExtraWidthDefault]) // arrowHeadExtraWidthDefault
    var shortwaveUpArrowPoints = [
        {'x': left, 'y': 0},
        {'x': left, 'y': arrowHeadHeight-arrowHeight},
        {'x': left - arrowHeadExtraWidth, 'y': arrowHeadHeight-arrowHeight},
        {'x': left + (right - left) / 2, 'y': -arrowHeight},
        {'x': middle, 'y': arrowHeadHeight-arrowHeight},
        {'x': middle, 'y': 0} //-arrowHeight+verticalMargin}
    ]
    var longwaveUpArrowPoints = [
        {'x': middle, 'y': 0}, //+verticalMargin-arrowHeight},
        {'x': middle, 'y': arrowHeadHeight-arrowHeight},
        {'x': left + (right - left) / 2, 'y': -arrowHeight},
        {'x': right + arrowHeadExtraWidth, 'y': arrowHeadHeight-arrowHeight},
        {'x': right, 'y': arrowHeadHeight-arrowHeight},
        {'x': right, 'y': 0} //-arrowHeight+verticalMargin}
    ]
    g.selectAll("polygon.shortwaveUpArrow")
        .data([shortwaveUpArrowPoints])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [d.x,d.y].join(",");
                }).join(" ");
            })
            .style("fill", json.shortwave.color)
            .attr('class', 'shortwaveUpArrow upArrow')
            .attr('data-size', layers[2][lastIndex].y);
            
    g.selectAll("polygon.longwaveUpArrow")
        .data([longwaveUpArrowPoints])
        .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [d.x,d.y].join(",");
                }).join(" ");
            })
            .style("fill", json.longwave.color)
            .attr('class', 'longwaveUpArrow upArrow')
            .attr('data-size', layers[3][lastIndex].y);

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

    g.append('line')
        .attr("x1", 0.5 * svgDims.flowWidth)
        .attr("y1", 0)
        .attr("x2", 0.5 * svgDims.flowWidth)
        .attr("y2", svgDims.flowHeight)

    g.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('fill', '#434358')
        .attr('x', left)
        .attr('y', -30) //23)
        .text('radiation (W/m2)');

    g.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('fill', '#434358')
        .attr('x', left)
        .attr('y', svgDims.flowHeight + 40) // 30)
        .text('radiation (W/m2)');
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
        content: function() { return '&nbsp;'}, // $(this).offset().top}, // return parseInt($(this).context.__data__[0].values[0]*10) / 10},
        track: true
    })
    
    $('path.arrowBody').mousemove(function(e) {
        var dataIndex = closestLayerIndex(y.invert(e.pageY - $(this).offset().top))
        $('.ui-tooltip-content').html(Math.round($(this).context.__data__[dataIndex].y * 10) / 10)
    })

    
}

var updateProfile = function(data) {
    d3.select("#profile").remove()
    var svg = d3.select('svg#rrtm').append("svg:g")
        .attr("id", "profile")
        .attr('transform', 'translate(' + (3*svgDims.altitudeAxis + svgDims.flowWidth + svgDims.betweenFlowAndProfile) + ', ' + svgDims.headerHeight + ')');
    
        
    var x = d3.scale.linear()
        .domain(d3.extent(data.xs).map(function(d,i){return d*Math.pow(1.1,2*i-1)}))
        .range([0,svgDims.profileWidth]);
    var y = d3.scale.linear()
        .domain(d3.extent(data.ys))
        .range([svgDims.flowHeight,0]);
        
    var xTopAxis = d3.svg.axis()
        .scale(x)
        .ticks(6)
        .orient("top");
    
    svg.append("g")
        .attr("class", "x axis")
        .call(xTopAxis);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .ticks(6)
        .orient("bottom");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,"+svgDims.flowHeight+")")
        .call(xAxis);
        
    var data = data.xs.map(function(x,i) {
        return {
            x: x,
            y: data.ys[i]
        }
    });
    
    var line = d3.svg.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); })
    
    svg.append("path")
        .datum(data)
        .attr("class", "profile")
        .attr("d", line);

    svg.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('fill', '#434358')
        .attr('x', svgDims.profileWidth/2)
        .attr('y', -30) //23)
        .text('temperature (K)');

    svg.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('fill', '#434358')
        .attr('x', svgDims.profileWidth/2)
        .attr('y', svgDims.flowHeight + 40) // 30)
        .text('temperature (K)');
}


// =========
// = Input =
// =========


var inputList = [
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
    
    // ========
    // = Axes =
    // ========
    var yRightAxis = d3.svg.axis()
        .scale(y)
        .orient('right')
        .ticks(5)

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(5)
    
    var vis = d3.select('svg#rrtm')
    var legend = vis.append("svg:g")
        .attr('transform', 'translate('+(svgDims.flowWidth)+',0)')
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 17)
        .attr('height', 17)
        .attr('fill', 'rgb(249,152,0)')
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 20)
        .attr('width', 17)
        .attr('height', 17)
        .attr('fill', 'rgb(88,98,168)')
        
    legend.append('text')
        .attr('x', 20)
        .attr('y', 17)
        .text("sunlight")
        .attr('fill', '#434358')


    legend.append('text')
        .attr('x', 20)
        .attr('y', 37)
        .text("Earth's radiation")
        .attr('fill', '#434358')

        
    var g = vis.append("svg:g")
        .attr('transform', 'translate(' + 0 + ', ' + svgDims.headerHeight + ')');

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
        .attr('transform', 'translate(' + (svgDims.altitudeAxis + svgDims.flowWidth) + ',0)')
        .call(yRightAxis)

    // g.append('text')
    //     .attr('fill', '#434358')
    //     .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', -(svgDims.flowWidth+(2*svgDims.altitudeAxis)))
    //     .attr('x', svgDims.flowHeight / 2).attr('dy', '.75em').attr('transform', 'rotate(90)')
    //     .text('altitude (km)')
            
    g = vis.append("svg:g")
            .attr('transform', 'translate(' + (2*svgDims.altitudeAxis + svgDims.flowWidth + svgDims.betweenFlowAndProfile) + ', ' + svgDims.headerHeight + ')');
        
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + svgDims.altitudeAxis + ',0)')
        .call(yAxis)
    // 
    // g.append('text')
    //     .attr('fill', '#434358')
    //     .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', 0)
    //     .attr('x', -svgDims.flowHeight / 2).attr('dy', '.75em').attr('transform', 'rotate(-90)')
    //     .text('altitude (km)')

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + (svgDims.altitudeAxis + svgDims.profileWidth) + ',0)')
        .call(yRightAxis)

    g.append('text')
        .attr('fill', '#434358')
        .attr('class', 'y label').attr('text-anchor', 'middle').attr('y', -(svgDims.profileWidth+(2*svgDims.altitudeAxis)))
        .attr('x', svgDims.flowHeight / 2).attr('dy', '.75em').attr('transform', 'rotate(90)')
        .text('altitude (km)')
    
    $("input, select[name='aerosols']").change(function() {
        if ($(this).attr("name") == "r_liq") {
            // alert(modelData["r_liq"])
            var r_liq = $(this).val()
            $.each(modelData["r_liq"], function(i,d) {
                modelData["r_liq"][i] = r_liq
            })
        } else {
            if ($(this).attr("name") == "asdir") {
                $("select option").filter(function() {
                    return $(this).text() == 'Custom albedo'; 
                }).prop('selected', true);
            }
            modelData[$(this).attr("name")] = $(this).val()
            if ($(this).hasClass("cloud")) {
                updateClouds($(this).attr("name"), $(this).val())
            }
        }

        updatePage()
    })
    
    $("select[name='surface']").change(function() {
        if ($(this).val() != "custom") {
            $("input[name='asdir']").val($(this).val())
            modelData['asdir'] = $(this).val()
            updatePage()
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

    modelData['cldf'][index] = +value
}
