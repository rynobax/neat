neat uses direct encoding
artificial synapsis solves competing convesions
explicit fitness sharing allows for specification
minimal initial population complexity

Genome = node genes + connections genes
node gene = input / output / hidden
connection gene:
in node
out node
weight
on/off
innovation #

Transfer function is 1 / (1 + e^-4.9x)

Mutations:
change weights
add connection
new connection between two unconnected nodes, random weight
add node
existing connection is split and new node placed in the middle (A->B into A->B->C)
old connection is disabled
two new connections are added
(A->B) has weight of 1
(B->C) has weight of old connection (A->B)

80% of connection weights mutating
if mutated:
90% chance of uniform change
10% chance of new random value
3% chance to add new node
5% chance of new link

Innovation
global innovation number is incremented whenever structural mutation happens, resulting gene gets the number
if identical mutations happen in the same generation, give the resulting genes the same number

Reproducing
lines parents up along innovation number and take randomly from either parent
excess/disjoint genes are taken from more fit parent (or randomly inherit them if equal)
genes are enabled/disabled here, if either parent has gene disabled there's a chance it becomes disabled
75% chance of inherited gene disabled if it was disabled in either parent
25% chance that offspring is just a mutated parent (no crossover)
Interspecies mating is 0.1%

Genes Only Present in One Parent
Excess genes = number higher than the other parents max number
disjoin genes = number lower than other parents max number

Speciation
c1, c2, c3 = preset coefficients (1, 1, 0.4)
N = number of genes in the larger genome
W = average weight differences of matching genes
SpecDelta = ((c1 _ E) / N) + ((c2 _ D) / N) + (c3 \* W)

maintain an ordered list of species
each species has a rep from the prev generation randomly chosen
each genome is assigned to the first species in the list it is compatible with (? maybe just compare delta to some threshold)
if there is no compatible species, a new species is created

Fitness
accounts for species overall fitness (explicit fitness sharing)
fi = individual fitness of genome i
sum[j] = sum of every genome in the population where other genome is j
dist = SpecDelta(i, j)
sh = sharing function, dist > THRESHOLD ? 0 : 1 (THRESHOLD = 3.0)
fitness = fi / sum[j](<sh(dist)>)
(basically fitness / number of genomes in the species)

Every species gets allotted number of offspring based on proportion of sum of adjusted fitnesses to member organisms
Reproduce by eliminating the lowest performing members (how many?) and the replacing with offspring from the species
When the fitness of the entire population has not improved for 20 generations, only allow top two species to reproduce
champion of each species with more than 5 genomes is copied into next generation unchanged

Start
All inpurts are connected directly to outputs

questions:
how do genes get disabled originally
