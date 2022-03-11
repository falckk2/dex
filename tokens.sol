//SPDX-License-Identifier: UNLICENSED

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

pragma solidity ^0.8.0;

contract Link is ERC20 {

    constructor() ERC20("ChainLink", "LINK") public {
        _mint(msg.sender, 10000);
    }

}