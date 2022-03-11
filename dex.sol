//SPDX-License-Identifier: UNLICENSED

import "./wallet.sol";

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Dex is Wallet{
    using SafeMath for uint256;
    uint256 public nextOrderID = 0;

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
        uint filled;
    }

    mapping(bytes32 => mapping(uint => Order[])) orderBook;
    function  getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory){
        return orderBook[ticker][uint(side)];
    }

    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public{
        if(side == Side.BUY){
            require(balances[msg.sender]["ETH"] >= amount.mul(price));
        }
        if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount);
        }

        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(
            Order(nextOrderID, msg.sender, side, ticker, amount, price, 0)
        );
        
        uint i = orders.length > 0 ? orders.length - 1 : 0;
        if(side == Side.BUY){
            while(i > 0){
                if(orders[i - 1].price > orders[i].price) {
                    break;
                }
                Order memory orderToMove = orders[i - 1];
                orders[i - 1] = orders[i];
                orders[i] = orderToMove;
                i--;
            }
        }
        else if(side == Side.SELL){
            while(i > 0){
                if(orders[i - 1].price < orders[i].price) {
                    break;   
                }
                Order memory orderToMove = orders[i - 1];
                orders[i - 1] = orders[i];
                orders[i] = orderToMove;
                i--;
            }
        }
        nextOrderID++;
    }


    

    function marketOrder(Side side, bytes32 ticker, uint amount) public{
        if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Insufficient amount of tokens");
        }

        uint orderBookSide;
        if(side == Side.BUY){
            orderBookSide = 1;
        } else {
            orderBookSide = 0;
        }
        Order[] storage orders = orderBook[ticker][orderBookSide];
        
        uint totalfilled = 0;
        uint cost = 0;
        uint left;
        uint filled;
        uint remainder;
        for(uint i = 0; i < orders.length && amount > totalfilled; i++){
            left = orders[i].amount - orders[i].filled;
            remainder = amount - totalfilled;
            if(left < remainder){
                cost = left.mul(orders[i].price);
                orders[i].filled = orders[i].amount;
                filled = left;
                totalfilled = totalfilled + left;
            } else {
                cost = (remainder).mul(orders[i].price);
                orders[i].filled = orders[i].filled.add(remainder);
                filled = remainder;
                totalfilled = amount;
            }

            if(side == Side.BUY){
                require(cost <= balances[msg.sender]["ETH"]);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                balances[msg.sender]["LINK"] = balances[msg.sender]["LINK"].add(filled);

                balances[orders[i].trader]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                balances[orders[i].trader]["LINK"] = balances[msg.sender]["LINK"].sub(filled);
            }

            if(side == Side.SELL){
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                balances[msg.sender]["LINK"] = balances[msg.sender]["LINK"].sub(filled);

                balances[orders[i].trader]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                balances[orders[i].trader]["LINK"] = balances[msg.sender]["LINK"].add(filled);
            }

            if(totalfilled >= amount){
                break;
            }            
            
        }
    
        while(orders.length > 0 && orders[0].filled == orders[0].amount){
            for(uint i = 0; i < orders.length-1; i++){
                orders[i] = orders[i+1];
            }
            orders.pop(); 
        }
    }
    
}