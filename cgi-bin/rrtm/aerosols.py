from numpy import exp

# SW Bands in cm^-1
SW_BANDS = [
  [ 2600, 3250 ],               
  [ 3250, 4000 ],               
  [ 4000, 4650 ],               
  [ 4650, 5150 ],               
  [ 5150, 6150 ],               
  [ 6150, 7700 ],               
  [ 7700, 8050 ],               
  [ 8050, 12850],               
  [12850, 16000],               
  [16000, 22650],               
  [22650, 29000],               
  [29000, 38000],               
  [38000, 50000],               
  [  820, 2600 ]               
]

LW_BANDS = [
    [  10,  350],	
    [ 350,  500],	
    [ 500,  630],	
    [ 630,  700],	
    [ 700,  820],	
    [ 820,  980],	
    [ 980, 1080],	
    [1080, 1180],   
    [1180, 1390],	
    [1390, 1480],	
    [1480, 1800],	
    [1800, 2080],	
    [2080, 2250],	
    [2250, 2380],	
    [2380, 2600],	
    [2600, 3250]	
]

SCENARIOS = {
    # NON SI UNITS
    # number densities in number of particles / cm^3
    'ocean': {
        'water soluble': 1500.0,
        'sea salt (acc.)': 20.0,
        'sea salt (coa.)': 3.2e-3,
        'scale height': 1.0,
        'absolute height': 2.0
    },
    'desert': {
        'water soluble': 2000.0,
        'mineral (nuc.)': 269.5,
        'mineral (acc.)': 30.5,
        'mineral (coa.)': 0.142,
        'scale height': 2.0,
        'absolute height': 6.0
    },
    'city': {
        'water soluble': 56000.0,
        'insoluble': 1.5,
        'soot': 130000.0,
        'scale height': 8.0,
        'absolute height': 2.0
    },
    'land': {
        'water soluble': 2600.0,
        'insoluble': 0.15,
        'scale height': 8.0,
        'absolute height': 2.0
    },
    'polluted': {
        'water soluble': 7000.0,
        'insoluble': 0.6,
        'soot': 34300.0,
        'scale height': 8.0,
        'absolute height': 2.0
    },
    'sulfates': {
        'water soluble': 56000.0,
        'scale height': 8.0,
        'absolute height': 2.0
    },
    'carbon': {
        'soot': 130000.0,
        'scale height': 8.0,
        'absolute height': 2.0
    },
    'Antarctic': {
        'sulfate droplets': 42.9,
        'sea salt (acc.)': 0.47e-1,
        'mineral-transported': 0.53e-2,
        'scale height': 8.0,
        'absolute height': 10.0
    },
    'Pinatubo': {
        'water soluble': 70000.,
        'absolute height': 15.
    }
}

AEROSOL_CODES = {
    'insoluble': 'INSO',
    'water soluble': 'WASO',
    'soot': 'SOOT',
    'sea salt (acc.)': 'SSAM',
    'sea salt (coa.)': 'SSCM',
    'mineral (nuc.)': 'MINM',
    'mineral (acc.)': 'MIAM',
    'mineral (coa.)': 'MICM',
    'mineral-transported': 'MITR',
    'sulfate droplets': 'SUSO'
}

def optical_properties(name = '', altitude = 0, previous_altitude = 0, called_on = 'scenario', conditions = {}, band = [], aerosol_concentrations = {}):
    if called_on == 'scenario':
        conditions = SCENARIOS[name]

        tauaer_sw = []
        ssaaer_sw = []
        asmaer_sw = []
        tauaer_lw = []
        aerosol_concentrations = {'token': 'blah'}
        for i in range(len(altitude)):
            a = altitude[i]
            previous_altitude = i and altitude[i - 1]
            tauaer_sw.append([])
            ssaaer_sw.append([])
            asmaer_sw.append([])
            tauaer_lw.append([])
    
            for j in range(len(SW_BANDS)):
                b = SW_BANDS[j]
                # http://www.rascin.net/sites/default/files/downloads/OPAC.pdf
                tau, ssa, asm = optical_properties(called_on = 'layer', conditions = conditions, altitude = a, previous_altitude = previous_altitude, band = b, aerosol_concentrations = (not j) and aerosol_concentrations)
                tauaer_sw[-1].append(tau)
                ssaaer_sw[-1].append(ssa)
                asmaer_sw[-1].append(asm)
        
            for b in LW_BANDS:
                tau, ssa, asm = optical_properties(called_on = 'layer', conditions = conditions, altitude = a, previous_altitude = previous_altitude, band = b, aerosol_concentrations = False)
                tauaer_lw[-1].append(tau)
    
        opt_params = {
            'tauaer_sw': tauaer_sw,
            'ssaaer_sw': ssaaer_sw,
            'asmaer_sw': asmaer_sw,
            'tauaer_lw': tauaer_lw
        }
        
        opt_params.update(aerosol_concentrations)
        
        for key in opt_params:
            if hasattr(opt_params[key], '__iter__'):
                opt_params[key].reverse()
        
        return opt_params
    if called_on == 'layer':
        tau = []
        ssa = []
        asm = []
        gen = (aerosol for aerosol in conditions if aerosol.split()[-1] != 'height')
        for aerosol in gen:
            layer_max = min(conditions['absolute height'], altitude)
            layer_min = min(conditions['absolute height'], previous_altitude)

            if aerosol_concentrations:
                if aerosol not in aerosol_concentrations:
                    aerosol_concentrations[aerosol] = []
                if 'scale height' in conditions:
                    aerosol_concentrations[aerosol].append(number_density(conditions[aerosol], altitude, conditions['scale height'], conditions['absolute height']))
                else:
                    if previous_altitude <= conditions['absolute height'] < altitude:
                        aerosol_concentrations[aerosol].append(conditions[aerosol])
                    else:
                        aerosol_concentrations[aerosol].append(0.)
            # just take the average wavenumber ... probably too hacky of a way to do this? integrate?
            wavenumber = band[1] - band[0] / 2.0
            wavelength = 1 / (wavenumber * 100.0) #wavelength ext.coef  sca.coef  abs.coef  si.sc.alb  asym.par  ext.nor    ref.real  ref.imag

            for line in open('optdat/' + AEROSOL_CODES[aerosol].lower(), 'r').read().split('\n'):
                values = line.split()
                if float(values[0]) * 1.e-6 > wavelength:
                    extinction_coefficient = float(values[1]) # (1 / km) / (particles / cm^3)
                    # optical depth = int_{z_bottom}^{z_top} ext_coeff * number_dens(z) (1 / cm^3) * dz
                    if 'scale height' in conditions:
                        opt = extinction_coefficient * conditions[aerosol] * conditions['scale height'] * (exp(-layer_min/conditions['scale height']) - exp(-layer_max/conditions['scale height']))
                        tau.append(opt)
                        ssa.append(opt and float(values[4]))
                        asm.append(opt and float(values[5]))
                    else:
                        if previous_altitude <= conditions['absolute height'] < altitude:
                            # opt = ((1 / km) / (particles / cm^3)) * (km - km) * (particles / cm^3)
                            opt = extinction_coefficient * (layer_max - layer_min) * conditions[aerosol]
                            tau.append(opt)
                            ssa.append(opt and float(values[4]))
                            asm.append(opt and float(values[5]))
                        else:
                            tau.append(0.)
                            ssa.append(0.)
                            asm.append(0.)
                    break
                    
        
        total_tau = sum(tau)
        return total_tau, sum([ssa[i] and (ssa[i] * tau[i] / total_tau) for i in range(len(tau))]), sum([asm[i] and (asm[i] * tau[i] / total_tau) for i in range(len(tau))])

def number_density(ground_number_density, altitude, scale_height, absolute_height):
    if altitude > absolute_height:
        return 0
    else:
        return ground_number_density * exp(-altitude/scale_height)
