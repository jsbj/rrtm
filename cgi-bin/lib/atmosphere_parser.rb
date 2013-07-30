# This file pulls out an atmosphere JSON from the example input files given
# takes two arguments: the first is the file to pull from,
# the second is the name of the json to create

require 'rubygems'
require 'json'

MOLECULES = [
  'H2O', 'CO2', 'O3', 'N2O', 'CO', 'CH4', 'O2', 'NO', 'SO2', 'NO2', # 1 - 10
  'NH3', 'HNO3', 'OH', 'HF', 'HCL', 'HBR', 'HI', 'CLO', 'OCS', # 11 - 20
  'H2CO', 'HOCL', 'N2', 'HCN', 'CH3CL', 'H2O2', 'C2H2', 'C2H6', 'PH3', 'COF2', 'SF6', # 21 - 30
  'H2S', 'HCOOH' # 31 - 32
]

atmosphere = {
  'p' => [],
  'T' => [],
  'altitude' => [],
  'pbound' => [],
  'Tbound' => []
}

counter = nil

File.open(ARGV[0], 'r').each do |line|
  if counter
    if line =~ /%/
      break
    end
    
    if counter == 0
      atmosphere['ps'] = line[49..55].strip.to_f
      atmosphere['Ts'] = line[57..62].strip.to_f
    end
    
    # this needs to be fixed so that it can handle scripts with multiple lines of radiative active constituents
    if counter % 2 == 0
      atmosphere['pbound'] << line[0..14].strip.to_f
      atmosphere['Tbound'] << line[15..29].strip.to_f
      atmosphere['altitude'] << line[64..69].strip.to_f
      atmosphere['p'] << line[70..77].strip.to_f
      atmosphere['T'] << line[79..84].strip.to_f
    else
      line.split.each_with_index do |value, index|
        if index == 7
          # atmosphere['concentrations']['broadening gases'] ||= []
          # atmosphere['concentrations']['broadening gases'] << value.strip.to_f
        else
          atmosphere[MOLECULES[index].downcase] ||= []
          atmosphere[MOLECULES[index].downcase] << value.strip.to_f
        end
      end
    end
    
    counter += 1
  end
  
  if line =~ /H1/
    counter = 0
  end
end

File.open('atmospheres/' + ARGV[1] + '.json', 'w') do |f|
  f.write(JSON.generate(atmosphere))
end