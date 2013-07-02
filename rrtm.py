import json
from numpy import e, linspace, log

def input_file(atmosphere = 'mid-latitude summmer'):
    if type(atmosphere) == str:
        atmosphere = load_atmosphere(atmosphere) # see method below
        
    # create temporary file
    f = open('input_rrtm_tmp', 'w')
    
    # RECORD 1.1
    f.write('$') # marks the beginning of the file
    
    rows = []
    
    # RECORD 1.2
    # for all "records", keys are values, values are what column they belong in
    rows.append({
        int(False): 50, # IATM: do you want to use RRTATM, and atmospheric ray trace program?
        int(False): 70, # IXSECT: do you want to use cross-sections?
        int(False): 83, # ISCAT: which radiative transfer solver would you like to use? 0 == RRTM
        3: 85, # NUMANGS: using Gaussian quadrature, how many angles do you want to compute over?
        int(False): 90, # IOUT: what sort of output do you want (do you want it separated into bins?)
        int(False): 95 # ICLD: you want clouds with that?
    })
        
    # RECORD 1.4
    rows.append({
        294.2: 1, # TBOUND: what's the surface temperature in K?
        int(False): 12, # IEMS: do you want to specify the surface emissivity in different bands?
        int(False): 15 # IREFLECT: do you want specular reflection at the surface (like a mirror), as opposed to isotropic?
        # 1.0: 17 # SEMISS: what surface missivity do you want for each band?
    })
        
    # RECORD 2.1
    # assuming no ray tracing, e.g IATM == 0,

    MOLECULES = [None,
        'H2O', 'CO2', 'O3', 'N2O', 'CO', 'CH4', 'O2', 'NO', 'SO2', 'NO2', # 1 - 10
        'NH3', 'HNO3', 'OH', 'HF', 'HCL', 'HBR', 'HI', 'CLO', 'OCS', # 11 - 20
        'H2CO', 'HOCL', 'N2', 'HCN', 'CH3CL', 'H2O2', 'C2H2', 'C2H6', 'PH3', 'COF2', 'SF6', # 21 - 30
        'H2S', 'HCOOH' # 31 - 32
    ]
    
    paves = atmosphere['average pressures'] # average pressure for each layer in millibars
    taves = atmosphere['average temperatures'] # average temperature for each layer in K (here, a dry adiabat)
    PZ_Ls = atmosphere['bottom pressures'] # pressure at bottom of each layer in millibars
    TZ_Ls = atmosphere['bottom temperatures'] # temperature at bottom of each layer in K
    PZ_L_1 = atmosphere['surface pressure'] # pressure at bottom of atmosphere in millibars 
    TZ_L_1 = atmosphere['surface temperature'] # temperature at bottom of atmosphere in K
    nlayers = len(paves) # number of layers of atmosphere
    nmol = max([MOLECULES.index(molecule) for molecule in atmosphere['concentrations'].keys()]) # maximum "molecule number"
    
    rows.append({
        int(True): 2, # IFORM: read PAVE, WKL, WBORADL in E15.7 format, as opposed to F10.4, E10.3, E10.3 formats?
        str(nlayers).rjust(3): 3, # NLAYERS: how many layers (up to 200) do you want?
        str(max()).rjust(4): 6 # NMOL: what's the maximum number associated with the molecules you're using? (see MOLECULES list below)
    })
    
    # for each layer, make a collection of rows
    for i in range(nlayers):
        # for each layer, make a row designating pressure and temperature
        row = {
            '%10.4E' % paves[i]: 1, # PAVE, see above
            '%10.4E' % taves[i]: 11, # TAVE, see above
            '%8.3F' % PZ_Ls[i]: 66, # PZ(L), see above
            '%7.2F' % TZ_Ls[i]: 74, # TZ(L), see above
        }
        
        if i == 0:
            row['%8.3F' % PZ_L_1] = 44
            row['%7.2F' % TZ_L_1] = 52
        rows.append(row)
        
        # for every seven radiatively active constituents, make a row of concentrations
        row = {}
        for molecule_number in range(len(MOLECULES)):
            if 0 < molecule_number <= nmol:
                concentration = atmosphere['concentrations'][MOLECULES[molecule_number]][i]
                row['%10.4E' % concentration] = len(row) * 15 + 1
                if molecule_number == nmol or not (molecule_number % 7):
                    rows.append(row)
                    row = {}
    
    # write the rows to file
    for row in rows:
        f.write(make_indexed_line(row)) # see method definition below
    
    f.write('%') # marks the end of the file
    
    f.close()

def load_atmosphere(atmosphere):
    # loads a dictionary from a data file stored in /atmospheres
    
    f = open('atmospheres/' + atmopshere, 'r')
    
    json.load(f)
    
    f.close()
    
    

def make_indexed_line(entries):
    # makes a fixed-width columned line; entires has keys that are strings and
    # values that say the initial column at which to place the string
    
    line = [' '] * 120 # assuming a maximum line length of 120 characters
    for entry in entries:
        index = entries[entry] - 1 # the description is 1-indexed, Python is 0-indexed
        line[index:index + len(entry)] = list(str(entry))
        
    return ''.join(line)