#!/usr/bin/python

# Gotta have this to let the browser know it's json
print "Content-type: application/json\n\n";

import json, sys, re, os, climt, numpy, aerosols
from math import copysign, floor, log10, cos, pi, exp, asin

# parse JSON data request by client
model_data = json.load(sys.stdin)

# this could be looked up from model_data eventually
number_of_layers = 40 # 51
total_altitude = 32.0

if 'preset' in model_data:
    preset = model_data['preset']
else:
    preset = 'isothermal, no greenhouse gases'


if preset == 'isothermal, no greenhouse gases':
    # set defaults (different than CliMT's)
    Ts = 283.1
    Tbound = number_of_layers * [Ts]
    T = Tbound
    h2o = number_of_layers * [0.0]
    defaults = {
        "ps": 1013,
        "Ts": Ts,
        "scon": 1370,
        "asdir": 0.3,
        "zen": 62, 
        "tauaer_sw": number_of_layers * [0],
        "ssaaer_sw": number_of_layers * [0],
        "asmaer_sw": number_of_layers * [0],
        "tauaer_lw": number_of_layers * [0],
        "r_liq": number_of_layers * [10.0],
        "r_ice": number_of_layers * [13.0],
        "clwp": number_of_layers * [5.0],
        "ciwp": number_of_layers * [5.0],
        "cldf": number_of_layers * [0],
        "ccl4": number_of_layers * [0],
        "cfc11": number_of_layers * [0],
        "cfc12": number_of_layers * [0],
        "cfc22": number_of_layers * [0],
        "co2": number_of_layers * [0], 
        "n2o": number_of_layers * [0], 
        "altitude": list(numpy.linspace(0,total_altitude,num=number_of_layers+1, endpoint=True)[1:]), #[1.1, 2.1, 2.9, 3.7, 4.5, 5.3, 6.1, 6.8, 7.5, 8.2, 8.9, 9.6, 10.3, 11, 11.7, 12.4, 13.6, 14.7, 15.8, 16.9, 18, 19.1, 20.2, 21.3, 22.5, 23.7, 24.9, 26.2, 27.6, 29.1, 30.8, 32.9, 34.9, 36.9, 38.9, 40.9, 42.9, 44.9, 47.2, 53.9, 56.4, 58.4, 60.3, 61.7, 63.1, 64.5, 65.7, 66.8, 67.9, 69, 70], 
        "rh": number_of_layers * [0], 
        "p": number_of_layers * [0],
        "Tbound": Tbound, 
        "ch4": number_of_layers * [0], 
        "T": T, 
        "co": number_of_layers * [0], 
        "o3": number_of_layers * [0], 
        "o2": number_of_layers * [0.209], #97518, 0.20897572, 0.2089678, 0.2089866, 0.20899189, 0.20899543, 0.20899996, 0.20900373, 0.20900458, 0.20900519, 0.20900649, 0.20900634, 0.20900698, 0.20900562, 0.20900711, 0.20900925, 0.20900522, 0.20899965, 0.20899954, 0.20899963, 0.20899959, 0.20899966, 0.20899986, 0.20899987, 0.20900002, 0.20899989, 0.20899986, 0.2090022, 0.20900251, 0.2090067, 0.2090057, 0.20900536, 0.20900574, 0.20900482, 0.20900646, 0.20900702, 0.20900613, 0.20900463, 0.2090015, 0.20900197, 0.20901358, 0.2090466, 0.20902328, 0.20906644, 0.20911193, 0.20908101, 0.20904104, 0.20916539, 0.20922786, 0.20919746, 0.20908001], 
        "lev": list(1000. * numpy.exp(-9.8 * numpy.linspace(0,total_altitude,num=number_of_layers+1, endpoint=True)[1:] * 1000. / (Ts * 285.0))), # [891.46, 792.287, 718.704, 651.552, 589.841, 532.986, 480.526, 437.556, 398.085, 361.862, 328.507, 297.469, 269.015, 243, 218.668, 196.44, 162.913, 136.511, 114.564, 96.4903, 81.2, 68.4286, 57.6936, 48.6904, 40.5354, 33.733, 28.1201, 23.1557, 18.7914, 15.0693, 11.8006, 8.78628, 6.61328, 5.03469, 3.85333, 2.96408, 2.2918, 1.78227, 1.339, 0.589399, 0.430705, 0.333645, 0.261262, 0.216491, 0.179393, 0.148652, 0.1255, 0.106885, 0.091031, 0.077529, 0.067],
        'aerosols': 'profile',
        'tropopause': 15,
        'lapseRate': 0
    }
    
else:
    if preset == 'standard mid-latitude':
        adjust = 25.7
        # set defaults (different than CliMT's)
        T_old = [291.77, 287.03, 282.23, 277.43, 272.63, 267.83, 263.03, 258.3, 253.75, 249.2, 244.65, 240.13, 235.64, 231.1, 226.55, 222.01, 216.81, 215.71, 215.7, 215.7, 216.18, 217.39, 218.72, 220.08, 221.46, 222.88, 224.24, 225.81, 227.61, 230.17, 233.52, 237.51, 242.34, 247.27, 252.17, 257.13, 262.09, 267.05, 272, 274.41, 268.77, 263.53, 258.75, 253.76, 249, 244.24, 239.61, 234.65, 229.81, 224.97, 220.34]
        T = [t + adjust for t in T_old]
        Tbound_old = [289.25, 284.6, 279.8, 275, 270.2, 265.4, 260.55, 256, 251.45, 246.9, 242.35, 237.86, 233.35, 228.8, 224.25, 219.7, 215.74, 215.7, 215.7, 215.7, 216.8, 218.03, 219.44, 220.76, 222.2, 223.57, 224.98, 226.71, 228.66, 231.81, 235.4, 239.99, 244.95, 249.84, 254.77, 259.73, 264.69, 269.65, 274.56, 270.71, 265.88, 261, 256.08, 251.32, 246.56, 241.8, 237.02, 232.18, 227.34, 222.5, 218.1]
        Tbound = [t + adjust for t in Tbound_old]
        Ts_old = 294.2
        Ts = Ts_old + adjust
        h2o = [0.015946558, 0.011230157, 0.0076751928, 0.0052688639, 0.0036297729, 0.0023900282, 0.0017066754, 0.0012718296, 0.00095655693, 0.00069666741, 0.00050829613, 0.00036584702, 0.00024977655, 0.00013636267, 6.5472166e-05, 2.8419665e-05, 9.6973117e-06, 4.8207025e-06, 3.4318521e-06, 3.2663258e-06, 3.178493e-06, 3.1768304e-06, 3.2639416e-06, 3.4095149e-06, 3.5909502e-06, 3.8500998e-06, 4.0575464e-06, 4.251363e-06, 4.3863338e-06, 4.5309193e-06, 4.6839027e-06, 4.806785e-06, 4.9039072e-06, 4.9670398e-06, 5.016137e-06, 5.1013058e-06, 5.2471341e-06, 5.3810127e-06, 5.4697343e-06, 5.4735615e-06, 5.332653e-06, 5.1831207e-06, 5.0460312e-06, 4.8780507e-06, 4.7075605e-06, 4.5413699e-06, 4.3837813e-06, 4.2189254e-06, 4.0623413e-06, 3.9098322e-06, 3.7676771e-06][0:number_of_layers]
        p = [952.1147, 841.897, 755.3917, 685.0609, 620.7571, 561.5159, 506.7787, 458.9778, 417.8179, 379.9846, 345.1331, 313, 283.2681, 255.9648, 230.793, 207.5901, 179.6777, 149.8259, 125.467, 105.5072, 88.85838, 74.81903, 63.06029, 53.19867, 44.59128, 37.16316, 30.91292, 25.6397, 20.97451, 16.9346, 13.41941, 10.30125, 7.703475, 5.824757, 4.442682, 3.407392, 2.627624, 2.037819, 1.56118, 0.9634139, 0.5106084, 0.3820259, 0.2975729, 0.2388066, 0.1978831, 0.1639725, 0.1372726, 0.1161604, 0.098930135, 0.084255733, 0.072246842]
        defaults = {
            "ps": 1013,
            "Ts": Ts,
            "scon": 1370,
            "asdir": 0.3,
            "zen": 62, 
            "tauaer_sw": number_of_layers * [0],
            "ssaaer_sw": number_of_layers * [0],
            "asmaer_sw": number_of_layers * [0],
            "tauaer_lw": number_of_layers * [0],
            "r_liq": number_of_layers * [0],
            "r_ice": number_of_layers * [13.0],
            "clwp": number_of_layers * [0],
            "ciwp": number_of_layers * [0],
            "cldf": number_of_layers * [0],
            "ccl4": number_of_layers * [0],
            "cfc11": number_of_layers * [0],
            "cfc12": number_of_layers * [0],
            "cfc22": number_of_layers * [0],
            "co2": number_of_layers * [355], 
            "n2o": [320.14772999999997, 320.14808, 320.12952, 320.17348, 320.20259, 320.2492, 320.18053000000003, 320.15103, 320.06952, 319.64703000000003, 317.94278, 314.85408, 309.93951, 302.8905, 297.28139, 293.30249, 286.54488999999995, 279.02988, 269.73828, 254.67132999999998, 231.32466, 199.50788999999997, 169.08091, 139.91885000000002, 117.2268, 103.31899, 94.382699, 87.561951, 82.404142, 75.596006, 66.9516, 54.150636000000006, 42.426844, 32.571123, 24.015852, 17.783966000000003, 12.921510000000001, 9.3075085, 6.6677854, 3.5912390999999997, 2.0309472, 1.7047587, 1.4732259, 1.3152129, 1.2046001, 1.1028871, 1.0173566, 0.9552473300000001, 0.9000983300000001, 0.8477577, 0.8001817499999999], 
            "altitude": [1.1, 2.1, 2.9, 3.7, 4.5, 5.3, 6.1, 6.8, 7.5, 8.2, 8.9, 9.6, 10.3, 11, 11.7, 12.4, 13.6, 14.7, 15.8, 16.9, 18, 19.1, 20.2, 21.3, 22.5, 23.7, 24.9, 26.2, 27.6, 29.1, 30.8, 32.9, 34.9, 36.9, 38.9, 40.9, 42.9, 44.9, 47.2, 53.9, 56.4, 58.4, 60.3, 61.7, 63.1, 64.5, 65.7, 66.8, 67.9, 69, 70], 
            "rh": [h2o[i]*p[i]*10000./(611. * exp(2.501e6 /(461.5 * 273.15)) * exp(-2.501e6 / (461.5 * T[i]))) for i in range(len(h2o))], 
            "p": p, 
            "Tbound": Tbound, 
            "ch4": [1700.7853, 1700.7861, 1700.6882, 1700.0174, 1696.7191, 1689.0904999999998, 1677.4702, 1662.5031999999999, 1646.9684, 1632.9801, 1622.3284999999998, 1607.1415, 1582.0669, 1556.2247, 1531.3253, 1508.0506, 1480.6419, 1447.9623, 1415.2675000000002, 1379.503, 1342.601, 1301.4651999999999, 1245.1943, 1172.2138, 1075.8682999999999, 965.1576, 854.01462, 771.0717099999999, 725.38978, 680.32085, 634.01592, 579.41355, 527.36578, 481.60666, 437.54815, 394.57359, 352.15132, 310.31249, 267.31394, 200.8872, 158.78383, 154.0019, 151.14806000000002, 150.15239, 150.18485, 150.16241, 150.13467, 150.23033, 150.28188, 150.26681, 150.18884], 
            "T": T, 
            "co": [1.4735235e-07, 1.4203219e-07, 1.3746356e-07, 1.338817e-07, 1.3135738e-07, 1.3046302e-07, 1.293139e-07, 1.2701938e-07, 1.2377659e-07, 1.1940332e-07, 1.1352941e-07, 1.0700342e-07, 1.0015444e-07, 9.3152551e-08, 8.5588468e-08, 7.7191764e-08, 6.3881643e-08, 4.8797485e-08, 3.7298612e-08, 2.8723687e-08, 2.2545748e-08, 1.7379815e-08, 1.4111547e-08, 1.2622904e-08, 1.2397807e-08, 1.3167179e-08, 1.4350868e-08, 1.5625453e-08, 1.6708778e-08, 1.8091109e-08, 1.9843396e-08, 2.1874927e-08, 2.384691e-08, 2.5646894e-08, 2.7513584e-08, 2.9431952e-08, 3.0938047e-08, 3.230932e-08, 3.3800561e-08, 3.6464382e-08, 3.9601694e-08, 4.2654523e-08, 4.5695458e-08, 4.9774858e-08, 5.4377978e-08, 5.9385144e-08, 6.5223382e-08, 7.4618846e-08, 8.5339593e-08, 9.7556516e-08, 1.1081534e-07], 
            "o3": [0.031872162, 0.035456235, 0.039477314, 0.043921091, 0.048850309999999994, 0.054422609999999996, 0.061250461, 0.069855773, 0.079463597, 0.08915115, 0.10168034, 0.1155858, 0.13068458, 0.16048106, 0.19350828, 0.22751290999999998, 0.304286, 0.43981947, 0.52382995, 0.63216254, 0.82302279, 1.2512421999999999, 1.8039109, 2.2908109, 2.8324889, 3.4517834, 4.2219771999999995, 5.032683899999999, 5.6775239, 6.3139009, 6.9619100000000005, 7.772886399999999, 8.524654700000001, 8.8305105, 8.490472299999999, 7.5621829, 6.2966351, 5.1043844, 4.0821087, 2.8155102000000003, 1.803627, 1.545081, 1.3594723, 1.1832445999999999, 1.0330702, 0.90162695, 0.78788491, 0.67509507, 0.57978644, 0.49771251, 0.42984522000000003], 
            "o2": [0.20897518, 0.20897572, 0.2089678, 0.2089866, 0.20899189, 0.20899543, 0.20899996, 0.20900373, 0.20900458, 0.20900519, 0.20900649, 0.20900634, 0.20900698, 0.20900562, 0.20900711, 0.20900925, 0.20900522, 0.20899965, 0.20899954, 0.20899963, 0.20899959, 0.20899966, 0.20899986, 0.20899987, 0.20900002, 0.20899989, 0.20899986, 0.2090022, 0.20900251, 0.2090067, 0.2090057, 0.20900536, 0.20900574, 0.20900482, 0.20900646, 0.20900702, 0.20900613, 0.20900463, 0.2090015, 0.20900197, 0.20901358, 0.2090466, 0.20902328, 0.20906644, 0.20911193, 0.20908101, 0.20904104, 0.20916539, 0.20922786, 0.20919746, 0.20908001], 
            "lev": [891.46, 792.287, 718.704, 651.552, 589.841, 532.986, 480.526, 437.556, 398.085, 361.862, 328.507, 297.469, 269.015, 243, 218.668, 196.44, 162.913, 136.511, 114.564, 96.4903, 81.2, 68.4286, 57.6936, 48.6904, 40.5354, 33.733, 28.1201, 23.1557, 18.7914, 15.0693, 11.8006, 8.78628, 6.61328, 5.03469, 3.85333, 2.96408, 2.2918, 1.78227, 1.339, 0.589399, 0.430705, 0.333645, 0.261262, 0.216491, 0.179393, 0.148652, 0.1255, 0.106885, 0.091031, 0.077529, 0.067],
            'active_input': 'co2'
        }

# import pdb; pdb.set_trace()
# apply defaults
for key in defaults:
    if not key in model_data:
        if hasattr(defaults[key], '__iter__'):
            model_data[key] = defaults[key][0:number_of_layers]
        else:
            model_data[key] = defaults[key]

# same sw albedo all around
model_data['asdif'] = model_data['asdir']
model_data['aldir'] = model_data['asdir']
model_data['aldif'] = model_data['asdir']

# import pdb; pdb.set_trace()
# make concentrations into volume mixing ratios
unit_change = {
    1.e-6: ['cfc11', 'cfc12', 'cfc22', 'o3'], # ppm
    1.e-3: ['ch4', 'n2o'], # ppb
    1.e-12: ['ccl4'] # ppt
}

model_data['h2o'] = [model_data['rh'][i] * 611. * exp(2.501e6 /(461.5 * 273.15)) * exp(-2.501e6 / (461.5 * model_data['T'][i])) / (model_data['lev'][i] * 10000.) for i in range(len(h2o))]

for factor in unit_change:
    for key in unit_change[factor]:
        model_data[key] = [value * factor for value in model_data[key]]

# CliMT uses opposite order for layers
for key in model_data:
    if hasattr(model_data[key], '__iter__'):
        model_data[key].reverse()

# import pdb; pdb.set_trace()

# AEROSOLS:
# model_data['aerosols'] = 'city'
model_data.update({        
    'insoluble': number_of_layers * [0],
    'water soluble': number_of_layers * [0],
    'soot': number_of_layers * [0],
    'sea salt (acc.)': number_of_layers * [0],
    'sea salt (coa.)': number_of_layers * [0],
    'mineral (nuc.)': number_of_layers * [0],
    'mineral (acc.)': number_of_layers * [0],
    'mineral (coa.)': number_of_layers * [0],
    'mineral-transported': number_of_layers * [0],
    'sulfate droplets': number_of_layers * [0]
})

# model_data['aerosols'] = 'city'
if 'aerosols' in model_data and model_data['aerosols'] != 'profile':
    model_data.update(aerosols.optical_properties(name = model_data['aerosols'], altitude = model_data['altitude'][::-1], called_on = 'conditions'))
else:
    model_data.update({
        'tauaer_sw': number_of_layers * [len(aerosols.SW_BANDS) * [0]],
        'ssaaer_sw': number_of_layers * [len(aerosols.SW_BANDS) * [0]],
        'asmaer_sw': number_of_layers * [len(aerosols.SW_BANDS) * [0]],
        'tauaer_lw': number_of_layers * [len(aerosols.LW_BANDS) * [0]]
    })

# import pdb; pdb.set_trace()
# set whether this is a global average or not
global_average = True

# a useful function
def sigdig(x, digits=1):
    if x: x = copysign(round(x, -int(floor(log10(abs(x)))) + (digits - 1)), x)
    return x


# if it's a global average, make the first run a night-time case
if global_average:
    
    lw_model = climt.radiation(scheme='rrtm', do_sw=0, **model_data)
    
    fluxes = {
        'swuflx': numpy.array(lw_model['swuflx']),
        'swdflx': numpy.array(lw_model['swdflx']),
        'lwuflx': numpy.array([sigdig(float(f), 3) for f in lw_model['lwuflx']]),
        'lwdflx': numpy.array([sigdig(float(f), 3) for f in lw_model['lwdflx']]),
        'LwToa': sigdig(float(lw_model['LwToa']), 3),
        'SwToa': 0.
    }
    
    number_of_divisions = 20
    for n in range(number_of_divisions):
        model_data['zen'] = asin((n + .5)/number_of_divisions) * 180 / pi
        sw_model = climt.radiation(scheme = 'rrtm', do_lw=0, **model_data)
        fluxes['swuflx'] += numpy.array(sw_model['swuflx']) / (2 * number_of_divisions)
        fluxes['swdflx'] += numpy.array(sw_model['swdflx']) / (2 * number_of_divisions)
        fluxes['SwToa'] += sw_model['SwToa'] / (2 * number_of_divisions)

    fluxes['swuflx'] = numpy.array([sigdig(float(f), 3) for f in fluxes['swuflx']])
    fluxes['swdflx'] = numpy.array([sigdig(float(f), 3) for f in fluxes['swdflx']])
    fluxes['uflx'] = fluxes['lwuflx'] + fluxes['swuflx']
    fluxes['dflx'] = fluxes['lwdflx'] + fluxes['swdflx']
    fluxes['SwToa'] = sigdig(float(fluxes['SwToa']), 3)
else:
    model = climt.radiation(scheme='rrtm', **model_data)

    fluxes = {
        'swuflx': numpy.array([sigdig(float(f), 3) for f in model['swuflx']]),
        'swdflx': numpy.array([sigdig(float(f), 3) for f in model['swdflx']]),
        'lwuflx': numpy.array([sigdig(float(f), 3) for f in model['lwuflx']]),
        'lwdflx': numpy.array([sigdig(float(f), 3) for f in model['lwdflx']]),
        'uflx': numpy.array([sigdig(float(model['swuflx'][i] + model['lwuflx'][i]), 3) for i in range(len(model['swuflx']))]),
        'dflx': numpy.array([sigdig(float(model['swdflx'][i] + model['lwdflx'][i]), 3) for i in range(len(model['swdflx']))]),
        'LwToa': sigdig(float(model['LwToa']), 3),
        'SwToa': sigdig(float(model['SwToa']), 3)
    }

# calculate fluxes
fluxes['net_toa'] = round(fluxes['LwToa'] + fluxes['SwToa'])
# json doesn't get NUMPY arrays:
for key in fluxes:
    if key not in ['LwToa', 'SwToa', 'net_toa']:
        fluxes[key] = list(fluxes[key])

# put the fluxes into the master model_data dict
for key in fluxes:
    model_data[key] = fluxes[key]
    
# undo the unit conversion
for factor in unit_change:
    for key in unit_change[factor]:
        model_data[key] = [value / factor for value in model_data[key]]

# put the layers back in the order we're working with
for key in model_data:
    if hasattr(model_data[key], '__iter__'):
        model_data[key].reverse()

# send the JSON to the client
print json.dumps(model_data)

# def load_atmosphere(atmosphere):
#     # loads a dictionary from a data file stored in /atmospheres
#     f = open('atmospheres/' + atmosphere + '.json', 'r')
#     atmosphere = json.load(f)
#     f.close()
#     
#     return atmosphere

# RRTM Reference:
# Mlawer, E.J., S.J. Taubman, P.D. Brown,  M.J. Iacono and 
# S.A. Clough: RRTM, a validated correlated-k model for the 
# longwave. J. Geophys. Res., 102, 16,663-16,682, 1997         

