#!/usr/local/bin/python

# Gotta have this to let the browser know it's json
print "Content-type: application/json\n\n";


# import getpass, sys; sys.stderr.write(str(getpass.getuser()))
import os, sys, json, re, climt, numpy, aerosols
from math import copysign, floor, log10, cos, pi, exp, asin, acos, floor, copysign

# parse JSON data request by client
model_data = json.load(sys.stdin)

# this could be looked up from model_data eventually
number_of_layers = 51
total_altitude = 35.0

# set defaults (different than CliMT's)
h2o = number_of_layers * [0.0]
# list(1000. * numpy.exp(-9.8 * numpy.linspace(0,total_altitude,num=number_of_layers+1, endpoint=True)[1:] * 1000. / (Ts * 285.0)))
Ts = 287.0
ps = 1013.0
R = 287.0
g = 9.8

defaults = {
    "ps": ps,
    "Ts": Ts,
    "lapseRate": 10.0,
    "tropopause": 15.0,
    "scon": 1360,
    "asdir": 0.3,
    "zen": 62,
    "altitude": list(-R*250*numpy.log(numpy.linspace(ps,40,num=number_of_layers+1)[1:]/1013)/(1e3 * g)),
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
    "co2": 400, 
    "n2o": number_of_layers * [0], 
    "rh": number_of_layers * [0], 
    "p": number_of_layers * [0],
    "ch4": 1.7, 
    "co": number_of_layers * [0], 
    "o3": number_of_layers * [0],
    "h2o": [7.2 * h for h in [0.015946558, 0.011230157, 0.0076751928, 0.0052688639, 0.0036297729, 0.0023900282, 0.0017066754, 0.0012718296, 0.00095655693, 0.00069666741, 0.00050829613, 0.00036584702, 0.00024977655, 0.00013636267, 6.5472166e-05, 2.8419665e-05, 9.6973117e-06, 4.8207025e-06, 3.4318521e-06, 3.2663258e-06, 3.178493e-06, 3.1768304e-06, 3.2639416e-06, 3.4095149e-06, 3.5909502e-06, 3.8500998e-06, 4.0575464e-06, 4.251363e-06, 4.3863338e-06, 4.5309193e-06, 4.6839027e-06, 4.806785e-06, 4.9039072e-06, 4.9670398e-06, 5.016137e-06, 5.1013058e-06, 5.2471341e-06, 5.3810127e-06, 5.4697343e-06, 5.4735615e-06, 5.332653e-06, 5.1831207e-06, 5.0460312e-06, 4.8780507e-06, 4.7075605e-06, 4.5413699e-06, 4.3837813e-06, 4.2189254e-06, 4.0623413e-06, 3.9098322e-06, 3.7676771e-06]],
    "h2oScale": 1,
    "o2": number_of_layers * [0.209], #97518, 0.20897572, 0.2089678, 0.2089866, 0.20899189, 0.20899543, 0.20899996, 0.20900373, 0.20900458, 0.20900519, 0.20900649, 0.20900634, 0.20900698, 0.20900562, 0.20900711, 0.20900925, 0.20900522, 0.20899965, 0.20899954, 0.20899963, 0.20899959, 0.20899966, 0.20899986, 0.20899987, 0.20900002, 0.20899989, 0.20899986, 0.2090022, 0.20900251, 0.2090067, 0.2090057, 0.20900536, 0.20900574, 0.20900482, 0.20900646, 0.20900702, 0.20900613, 0.20900463, 0.2090015, 0.20900197, 0.20901358, 0.2090466, 0.20902328, 0.20906644, 0.20911193, 0.20908101, 0.20904104, 0.20916539, 0.20922786, 0.20919746, 0.20908001], 
    # "lev": lev, # [891.46, 792.287, 718.704, 651.552, 589.841, 532.986, 480.526, 437.556, 398.085, 361.862, 328.507, 297.469, 269.015, 243, 218.668, 196.44, 162.913, 136.511, 114.564, 96.4903, 81.2, 68.4286, 57.6936, 48.6904, 40.5354, 33.733, 28.1201, 23.1557, 18.7914, 15.0693, 11.8006, 8.78628, 6.61328, 5.03469, 3.85333, 2.96408, 2.2918, 1.78227, 1.339, 0.589399, 0.430705, 0.333645, 0.261262, 0.216491, 0.179393, 0.148652, 0.1255, 0.106885, 0.091031, 0.077529, 0.067],
    'aerosols': 'no aerosols'
}



# import pdb; pdb.set_trace()
# apply defaults
for key in defaults:
    if not key in model_data:
        if hasattr(defaults[key], '__iter__'):
            model_data[key] = defaults[key][0:number_of_layers]
        else:
            model_data[key] = defaults[key]

model_data["Tbound"] = [float(model_data["Ts"]) - min(float(alt),float(model_data["tropopause"])) * float(model_data["lapseRate"]) for alt in model_data["altitude"]]
model_data["T"] = number_of_layers * [0]
model_data["lev"] = number_of_layers * [0]
for i in range(number_of_layers):
    if i == 0:
        T = (float(model_data["Ts"]) + float(model_data["Tbound"][0])) / 2
        model_data["T"][0] = T
        deltaZ = model_data["altitude"][i] * 1e3
        model_data["lev"][0] = ps * numpy.exp(-g * deltaZ / (T * R))
    else:
        T = (float(model_data["Tbound"][i-1]) + float(model_data["Tbound"][i])) / 2
        model_data["T"][i] = T
        deltaZ = (model_data["altitude"][i] - model_data["altitude"][i-1]) * 1e3
        model_data["lev"][i] = model_data["lev"][i-1] * numpy.exp(-g * deltaZ / (T * R))

# model_data["lev"][number_of_layers-1] = min(model_data["lev"][number_of_layers-1], 13)

sys.stderr.write(str(model_data["lev"]))

# same sw albedo all around
model_data['asdif'] = model_data['asdir']
model_data['aldir'] = model_data['asdir']
model_data['aldif'] = model_data['asdir']

# import pdb; pdb.set_trace()
# make concentrations into volume mixing ratios
ghgs = ['co2', 'ch4'] # ppm

model_data['h2o'] = [float(h2o) * float(model_data['h2oScale']) for h2o in defaults['h2o']]

for key in ghgs:
    model_data[key] = number_of_layers * [float(model_data[key])]

# CliMT uses opposite order for layers
for key in model_data:
    if hasattr(model_data[key], '__iter__'):
        # sys.stderr.write(str(key))
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
if 'aerosols' in model_data and model_data['aerosols'] != 'no aerosols':
    model_data.update(aerosols.optical_properties(name = model_data['aerosols'], altitude = model_data['altitude'][::-1], called_on = 'scenario'))
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

# sys.stderr.write(str(model_data))
# sys.stderr.write("blah")
# if it's a global average, make the first run a night-time case
if global_average:
    # sys.stderr.write(str(model_data['scon']))
    # sys.stderr.write(str(model_data))
    lw_model = climt.radiation(scheme='rrtm', do_sw=0, **model_data)
    
    fluxes = {
        'swuflx': numpy.array(lw_model['swuflx']),
        'swdflx': numpy.array(lw_model['swdflx']),
        'lwuflx': numpy.array([sigdig(float(f), 3) for f in lw_model['lwuflx']]),
        'lwdflx': numpy.array([sigdig(float(f), 3) for f in lw_model['lwdflx']]),
        'LwToa': sigdig(float(lw_model['LwToa']), 3),
        'SwToa': 0.
    }
    
    # sys.stderr.write(str(fluxes))
    
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
for key in ghgs:
    model_data[key] = model_data[key][0]

# put the layers back in the order we're working with
for key in model_data:
    if hasattr(model_data[key], '__iter__'):
        model_data[key].reverse()



# sys.stderr.write(json.dumps(model_data))
# send the JSON to the client
# sys.stderr.write(json.dumps(model_data))
# sys.stderr.write(str(model_data['cldf']))
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

