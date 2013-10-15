#!/usr/bin/python

# Gotta have this to let the browser know it's json
print "Content-type: application/json\n\n";

import json, sys, re, os, climt, numpy, aerosols
from math import copysign, floor, log10, cos, pi, exp, asin, acos, floor, copysign

# parse JSON data request by client
model_data = json.load(sys.stdin)

# this could be looked up from model_data eventually
number_of_layers = 40 # 51
total_altitude = 32.0

# set defaults (different than CliMT's)
Ts = 251.5
Tbound = number_of_layers * [Ts]
T = Tbound
h2o = number_of_layers * [0.0]
defaults = {
    "ps": 1013,
    "Ts": Ts,
    "scon": 1366,
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
        model_data['zen'] = acos((n + .5)/number_of_divisions) * 180 / pi
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
fluxes['net_toa'] = fluxes['LwToa'] + fluxes['SwToa']
fluxes['net_toa'] = copysign(floor(abs(fluxes['net_toa'])), fluxes['net_toa'])
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

