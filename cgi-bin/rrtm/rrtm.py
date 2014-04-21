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
Ts = 288.5
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
    "co2": 400, 
    "n2o": number_of_layers * [0], 
    "rh": number_of_layers * [0], 
    "p": number_of_layers * [0],
    "ch4": 1.7, 
    "o3": number_of_layers * [0],
    "relativeHumidity": 100,
    "o2": number_of_layers * [0.209],
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
def equilibrium_pressure(T):
    return 6.1094 * exp(17.625 * (T - 273.15) / (T - 30.11))

model_data["h2o"] = [(equilibrium_pressure(T) / model_data['lev'][i]) * (float(model_data['relativeHumidity']) / 100.0) for (i,T) in enumerate(model_data['Tbound'])]
# same sw albedo all around
model_data['asdif'] = model_data['asdir']
model_data['aldir'] = model_data['asdir']
model_data['aldif'] = model_data['asdir']

# import pdb; pdb.set_trace()
# make concentrations into volume mixing ratios
ghgs = ['co2', 'ch4'] # ppm

# model_data['h2o'] = [float(h2o) * float(model_data['h2oScale']) for h2o in defaults['h2o']]

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

