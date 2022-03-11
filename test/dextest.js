const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');


contract.skip("DexTester", accounts => {
    it("the user  have ETH deposited such that deposited eth >= buy order value", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        //createLimitOrder should take care of approve and deposit
        await dex.depositEth({value: 10, from: accounts[0]})
        await truffleAssert.passes(
            dex.createLimitOrder(0,web3.utils.fromUtf8("LINK"), 1, 5, {from: accounts[0]})
        )
    })
    it("the user have ETH deposited such that deposited eth < buy order value", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        //createLimitOrder should take care of approve and deposit
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 50000, 50000, {from: accounts[0]})
        )
    })

    it("the user have tokens deposited such that token balance < sell order amount", async () =>{
        
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        truffleAssert.reverts(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 500000, 50, {from: accounts[0]})
        )
    })

    it("the user have enough tokens deposited such that token balance >= sell order amount", async () =>{
        
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 30);
        await dex.deposit(1, web3.utils.fromUtf8("LINK"));

        //createLimitOrder should take care of approve and deposit
        
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 5, {from: accounts[0]})
        )
    })

    it("order book BUY side should be sorted from highest to lowest", async () =>{
        
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.depositEth({value: 5000, from: accounts[0]});
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 2, 10);
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 3, 20);
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 30);
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 4, 40);
        
        
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        
        for(let i = 0; i < orderbook.length - 1; i++){
            
            assert(parseInt(orderbook[i].price) >= parseInt(orderbook[i+1].price), "not right buy order");
        }
    })

    it("order book SELL side should be sorted from lowest to highest", async () =>{
        
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await link.approve(dex.address, 1000);
        await dex.deposit(200, web3.utils.fromUtf8("LINK"));
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 2, 10);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 3, 20);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 30);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 4, 40);


        let orderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
       
        for(let i = 0; i < orderBook.length - 1; i++){
            
            assert(parseInt(orderBook[i].price) <= parseInt(orderBook[i+1].price), "not right sell order");
        }
    })

})