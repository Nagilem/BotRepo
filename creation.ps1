$rg = "BotLot"
$loc = "eastus2"
$keyName = "BotLot_Key"
$vnetName  = "BotLot-VNet"
$vnetPrefix = "10.0.0.0/16"
$subName = "Lot"
$subPrefix = "10.0.0.0/24"
$nsgName = "BotLot-NSG"
$pipGWName = "BotLot-VPN-PIP"
$gwName = "BotLot-VPN"
$gwSubName = "GatewaySubnet"
$gwSubPrefix = "10.0.1.0/24"
$vpnClientAddressPool = "192.168.0.0/24"
$vpnCertName = "BotLot_Root"
$vpnCertData = "D:\OneDrive\BotHeaven\Keys\BotLotRootPub.cer"
$vmAdmin = "botmaster"
$vmNum = 5
$vmNameBase = "BotLnx"

# login into azure
az login

#create the resource group
az group create `
--name $rg `
--location $loc

#create the ssh key for ssh login
az sshkey create `
--name $keyName `
--resource-group $rg

#create the vnet and subnet for bots
az network vnet create `
--name $vnetName `
--resource-group $rg `
--address-prefixes $vnetPrefix `
--subnet-name $subName `
--subnet-prefixes $subPrefix 

#create initial network security group
az network nsg create `
--name $nsgName `
--resource-group $rg `
--location $loc

#associate nsg with subnet
az network vnet subnet update `
--resource-group $rg `
--name $subName `
--vnet-name $vnetName `
--network-security-group $nsgName

#create VPN GW public IP
az network public-ip create `
--name $pipGWName `
--resource-group $rg `
--allocation-method Dynamic `
--location $loc `
--sku Basic `
--tier Regional `
--version IPv4

#Create Gateway Subnet
az network vnet subnet create `
--name $gwSubName `
--resource-group $rg `
--address-prefixes $gwSubPrefix `
--vnet-name $vnetName

#create VPN Gateway
az network vnet-gateway create `
--name $gwName `
--resource-group $rg `
--gateway-type Vpn `
--location $loc `
--public-ip-addresses $pipGWName `
--vnet $vnetName `
--sku Basic `
--address-prefixes $vpnClientAddressPool `
--vpn-type RouteBased `
--vpn-gateway-generation Generation1 `
--no-wait

#create VPN root cert for P2S
az network vnet-gateway root-cert create `
--resource-group $rg `
--gateway-name $gwName `
--name $vpnCertName `
--public-cert-data $vpnCertData 

#loop through to create VMs
for($i=1; $i -le $vmNum; $i++) {
    $tempVMName = $vmNameBase + $i
    $tempVMPIPName = $vmNameBase + $i + "-PIP"
    az vm create `
        --name $tempVMName `
        --resource-group $rg `
        --location $loc `
        --size Standard_B1ls `
        --image Canonical:0001-com-ubuntu-server-focal:20_04-lts:latest `
        --public-ip-address $tempVMPIPName `
        --public-ip-sku Basic `
        --public-ip-address-allocation static `
        --storage-sku Standard_LRS `
        --nsg $nsgName `
        --admin-username $vmAdmin `
        --ssh-key-name $keyName  
    
    az vm extension set `
        --resource-group $rg `
        --vm-name $tempVMName `
        --name customScript `
        --publisher Microsoft.Azure.Extensions `
        --settings ./script-config.json
    }
    