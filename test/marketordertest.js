const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');


contract("MarketTester", accounts => {
    it("When creating SELL market order the seller needs to have enough tokens for the trade", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})

        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "Initial LINK balance is not 0");

        await truffleAssert.reverts(dex.marketOrder(1, web3.utils.fromUtf8("LINK"), 30));        
    })
    
    it("Market orders can still be submitted even if order book is empty", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await dex.depositEth({value: 1, from: accounts[0]});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
        assert(orderbook.length == 0, "Buy side should be empty");
        
        truffleAssert.passes(dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 30));
        
    })
    it("Market order should be filled until order book emtpy or 100% filled", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        await dex.depositEth({value: 30, from: accounts[0]});
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        assert(orderbook.length == 0, "orderbook should be empty");
        
        await link.transfer(accounts[1], 50);
        await link.approve(dex.address, 8, {from: accounts[1]});
        await dex.deposit(7, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 5, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 2, 3, {from: accounts[1]})

        await truffleAssert.passes(dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 6), {from: accounts[0]});
        
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        await assert(orderbook.length == 1, "orderbook should have only one entry");

        //orderbook consumed
        await truffleAssert.passes(dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 2), {from: accounts[0]});
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        await assert(orderbook.length == 0);
        
    })
    it("The ETH balance of the buyer should decrease accordingly", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        await dex.depositEth({value: 50, from: accounts[0]});
        
        await link.transfer(accounts[1], 50);
        await link.approve(dex.address, 30, {from: accounts[1]});
        
        let before = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 5, {from: accounts[1]})
        await dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 5)

        let remainder = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        
        await assert.equal(before.toNumber()-25, remainder.toNumber(), "eth should be reduced by cost amount");
        
    })
    it("the token balance of the buyer should increase with the filled amounts", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        assert(orderbook.length == 0, "still have remainders from before");

        await dex.depositEth({value: 50, from: accounts[0]});
        await link.transfer(accounts[1], 50);
        await link.approve(dex.address, 30, {from: accounts[1]});
        await dex.deposit(10, web3.utils.fromUtf8("LINK"), {from: accounts[1]});

        let before = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 7, 7, {from: accounts[1]})
        
        await dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 7)

        let remainder = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
        
        assert.equal(before.toNumber()+7, remainder.toNumber(), "Link tokens should be reduced by the amount sold");
        
    })
    it("Filled limit orders should be removed from the orderbook", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        await assert(orderbook.length == 0, "still have remainders from before");
        
        await dex.depositEth({value: 80, from: accounts[0]});
        await link.transfer(accounts[1], 50);
        await link.approve(dex.address, 16, {from: accounts[1]});
        await dex.deposit(16, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 7, 7, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 2, 1, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 7, 7, {from: accounts[1]})

        await dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 7)

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        

        await assert.equal(orderbook.length, 2, "removal not performed?");

        await dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 14)

    })
    it("Partly filled limit orders should be marked", async () =>{
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        assert(orderbook.length == 0, "still have remainders from before");

        await dex.depositEth({value: 51, from: accounts[0]});
        await link.transfer(accounts[1], 50);
        await link.approve(dex.address, 16, {from: accounts[1]});
        await dex.deposit(7, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 7, {from: accounts[1]})

        await dex.marketOrder(0, web3.utils.fromUtf8("LINK"), 5)
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);

        assert.equal(orderbook[0].filled, 5);
        assert.equal(orderbook[0].amount, 10);
    
    })
})
