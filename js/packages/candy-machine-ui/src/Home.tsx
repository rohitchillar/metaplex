import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';

import styled from 'styled-components';
import { Container, Snackbar } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';
import { AlertState, toDate, formatNumber, getAtaForMint } from './utils';
import { MintCountdown } from './MintCountdown';
import { MintButton } from './MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';
import { sendTransaction } from './connection';
import { BsDiscord, BsTwitter, BsInstagram } from "react-icons/bs";
import { SiTiktok } from "react-icons/si";
import { MdOpenInNew } from "react-icons/md";
import nftING from "./assets/image/nft.png";
import nftImg1 from "./assets/image/nftimg1.png";
import nftImg3 from "./assets/image/nftimg3.png";
import './Home.css'

const ConnectButton = styled(WalletDialogButton)`
  height: 60px;
  margin-top: 2rem;
  margin-bottom: 4rem;
  color: white;
  border-top-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  font-size: 16px;
  font-weight: bold;
  -webkit-backdrop-filter: blur(30px);
  backdrop-filter: blur(30px);
  background-color:  #2a2b2fe1;
  font-family: Poppins;
  
`;

const MintContainer = styled.div``; // add your owns styles here

export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  txTimeout: number;
  rpcHost: string;
}

const teamData = [
  {
    photo: nftING,
    name: "Calvin",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Rohit",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Calvin",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Rohit",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Calvin",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Rohit",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Calvin",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Rohit",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Rohit",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
];

const advisorsData = [
  {
    photo: nftING,
    name: "Calvin",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Rohit",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
  {
    photo: nftING,

    name: "Calvin",
    desc: "lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem lorem ispsum Doloar sit amaet lorem ",
  },
];

const Home = (props: HomeProps) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });
  const [isActive, setIsActive] = useState(false);
  const [endDate, setEndDate] = useState<Date>();
  const [itemsRemaining, setItemsRemaining] = useState<number>();
  const [isWhitelistUser, setIsWhitelistUser] = useState(false);
  const [isPresale, setIsPresale] = useState(false);
  const [discountPrice, setDiscountPrice] = useState<anchor.BN>();

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet) {
      return;
    }

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );
        let active =
          cndy?.state.goLiveDate?.toNumber() < new Date().getTime() / 1000;
        let presale = false;
        // whitelist mint?
        if (cndy?.state.whitelistMintSettings) {
          // is it a presale mint?
          if (
            cndy.state.whitelistMintSettings.presale &&
            (!cndy.state.goLiveDate ||
              cndy.state.goLiveDate.toNumber() > new Date().getTime() / 1000)
          ) {
            presale = true;
          }
          // is there a discount?
          if (cndy.state.whitelistMintSettings.discountPrice) {
            setDiscountPrice(cndy.state.whitelistMintSettings.discountPrice);
          } else {
            setDiscountPrice(undefined);
            // when presale=false and discountPrice=null, mint is restricted
            // to whitelist users only
            if (!cndy.state.whitelistMintSettings.presale) {
              cndy.state.isWhitelistOnly = true;
            }
          }
          // retrieves the whitelist token
          const mint = new anchor.web3.PublicKey(
            cndy.state.whitelistMintSettings.mint,
          );
          const token = (await getAtaForMint(mint, anchorWallet.publicKey))[0];

          try {
            const balance = await props.connection.getTokenAccountBalance(
              token,
            );
            let valid = parseInt(balance.value.amount) > 0;
            // only whitelist the user if the balance > 0
            setIsWhitelistUser(valid);
            active = (presale && valid) || active;
          } catch (e) {
            setIsWhitelistUser(false);
            // no whitelist user, no mint
            if (cndy.state.isWhitelistOnly) {
              active = false;
            }
            console.log('There was a problem fetching whitelist token balance');
            console.log(e);
          }
        }
        // datetime to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.date) {
          setEndDate(toDate(cndy.state.endSettings.number));
          if (
            cndy.state.endSettings.number.toNumber() <
            new Date().getTime() / 1000
          ) {
            active = false;
          }
        }
        // amount to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.amount) {
          let limit = Math.min(
            cndy.state.endSettings.number.toNumber(),
            cndy.state.itemsAvailable,
          );
          if (cndy.state.itemsRedeemed < limit) {
            setItemsRemaining(limit - cndy.state.itemsRedeemed);
          } else {
            setItemsRemaining(0);
            cndy.state.isSoldOut = true;
          }
        } else {
          setItemsRemaining(cndy.state.itemsRemaining);
        }

        if (cndy.state.isSoldOut) {
          active = false;
        }

        setIsActive((cndy.state.isActive = active));
        setIsPresale((cndy.state.isPresale = presale));
        setCandyMachine(cndy);
      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }
    }
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const onMint = async (
    beforeTransactions: Transaction[] = [],
    afterTransactions: Transaction[] = [],
  ) => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        let mintOne = await mintOneToken(
          candyMachine,
          wallet.publicKey,
          beforeTransactions,
          afterTransactions,
        );

        const mintTxId = mintOne[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          // manual update since the refresh might not detect
          // the change immediately
          let remaining = itemsRemaining! - 1;
          setItemsRemaining(remaining);
          setIsActive((candyMachine.state.isActive = remaining > 0));
          candyMachine.state.isSoldOut = remaining === 0;
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          console.log(error);
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          console.log(error);
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
      // updates the candy machine state to reflect the lastest
      // information on chain
      refreshCandyMachineState();
    } finally {
      setIsUserMinting(false);
    }
  };

  const toggleMintButton = () => {
    let active = !isActive || isPresale;

    if (active) {
      if (candyMachine!.state.isWhitelistOnly && !isWhitelistUser) {
        active = false;
      }
      if (endDate && Date.now() >= endDate.getTime()) {
        active = false;
      }
    }

    if (
      isPresale &&
      candyMachine!.state.goLiveDate &&
      candyMachine!.state.goLiveDate.toNumber() <= new Date().getTime() / 1000
    ) {
      setIsPresale((candyMachine!.state.isPresale = false));
    }

    setIsActive((candyMachine!.state.isActive = active));
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);

  return (
    <div>
      <div className="navbar">
        <div className="logo">LS</div>
        <div style={{textAlign:"center"}}>
          <h2 style={{ margin: "0.4rem", fontFamily: "Alegreya" }}>LOST SOLZ</h2>
          <hr />
          <div className="navlinks">
            <a href="#home">Home</a>

            <a href="#about">About</a>

            <a href="#nft">NFT</a>

            <a href="#team">Team</a>

            <a href="#roadmap">Roadmap</a>
          </div>
        </div>
        <div className="contacts">
          <div className="social-icon">
            <BsDiscord size="25" />
          </div>
          <div className="social-icon">
            <BsTwitter size="25" />
          </div>
          <div className="social-icon">
            <BsInstagram size="25" />
          </div>
          <div className="social-icon">
            <SiTiktok size="25" />
          </div>
        </div>
      </div>
      <div className="hero" id="home">
        <h1 style={{fontFamily: "Alegreya", marginTop:"8rem"}}>SERIES 2 COMING SOON</h1>
        <Container maxWidth="xs" style={{
          position: 'relative', display: "flex", alignItems: "center",  justifyContent:"center"
        }}>
        <div>
          {!wallet.connected ? (
            <ConnectButton>Connect Wallet</ConnectButton>
          ) : (
            <>
              {candyMachine && (
                <Grid
                  container
                  direction="row"
                  justifyContent="center"
                  wrap="nowrap"
                >
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">
                      Remaining
                    </Typography>
                    <Typography
                      variant="h6"
                      color="textPrimary"
                      style={{
                        fontWeight: 'bold',
                      }}
                    >
                      {`${itemsRemaining}`}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      {isWhitelistUser && discountPrice
                        ? 'Discount Price'
                        : 'Price'}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="textPrimary"
                      style={{ fontWeight: 'bold' }}
                    >
                      {isWhitelistUser && discountPrice
                        ? `◎ ${formatNumber.asNumber(discountPrice)}`
                        : `◎ ${formatNumber.asNumber(
                            candyMachine.state.price,
                          )}`}
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    {isActive && endDate && Date.now() < endDate.getTime() ? (
                      <>
                        <MintCountdown
                          key="endSettings"
                          date={getCountdownDate(candyMachine)}
                          style={{ justifyContent: 'flex-end' }}
                          status="COMPLETED"
                          onComplete={toggleMintButton}
                        />
                        <Typography
                          variant="caption"
                          align="center"
                          display="block"
                          style={{ fontWeight: 'bold' }}
                        >
                          TO END OF MINT
                        </Typography>
                      </>
                    ) : (
                      <>
                        <MintCountdown
                          key="goLive"
                          date={getCountdownDate(candyMachine)}
                          style={{ justifyContent: 'flex-end' }}
                          status={
                            candyMachine?.state?.isSoldOut ||
                            (endDate && Date.now() > endDate.getTime())
                              ? 'COMPLETED'
                              : isPresale
                              ? 'PRESALE'
                              : 'LIVE'
                          }
                          onComplete={toggleMintButton}
                        />
                        {isPresale &&
                          candyMachine.state.goLiveDate &&
                          candyMachine.state.goLiveDate.toNumber() >
                            new Date().getTime() / 1000 && (
                            <Typography
                              variant="caption"
                              align="center"
                              display="block"
                              style={{ fontWeight: 'bold' }}
                            >
                              UNTIL PUBLIC MINT
                            </Typography>
                          )}
                      </>
                    )}
                  </Grid>
                </Grid>
              )}
              <MintContainer>
                {candyMachine?.state.isActive &&
                candyMachine?.state.gatekeeper &&
                wallet.publicKey &&
                wallet.signTransaction ? (
                  <GatewayProvider
                    wallet={{
                      publicKey:
                        wallet.publicKey ||
                        new PublicKey(CANDY_MACHINE_PROGRAM),
                      //@ts-ignore
                      signTransaction: wallet.signTransaction,
                    }}
                    gatekeeperNetwork={
                      candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                    }
                    clusterUrl={rpcUrl}
                    handleTransaction={async (transaction: Transaction) => {
                      setIsUserMinting(true);
                      const userMustSign = transaction.signatures.find(sig =>
                        sig.publicKey.equals(wallet.publicKey!),
                      );
                      if (userMustSign) {
                        setAlertState({
                          open: true,
                          message: 'Please sign one-time Civic Pass issuance',
                          severity: 'info',
                        });
                        try {
                          transaction = await wallet.signTransaction!(
                            transaction,
                          );
                        } catch (e) {
                          setAlertState({
                            open: true,
                            message: 'User cancelled signing',
                            severity: 'error',
                          });
                          // setTimeout(() => window.location.reload(), 2000);
                          setIsUserMinting(false);
                          throw e;
                        }
                      } else {
                        setAlertState({
                          open: true,
                          message: 'Refreshing Civic Pass',
                          severity: 'info',
                        });
                      }
                      try {
                        await sendTransaction(
                          props.connection,
                          wallet,
                          transaction,
                          [],
                          true,
                          'confirmed',
                        );
                        setAlertState({
                          open: true,
                          message: 'Please sign minting',
                          severity: 'info',
                        });
                      } catch (e) {
                        setAlertState({
                          open: true,
                          message:
                            'Solana dropped the transaction, please try again',
                          severity: 'warning',
                        });
                        console.error(e);
                        // setTimeout(() => window.location.reload(), 2000);
                        setIsUserMinting(false);
                        throw e;
                      }
                      await onMint();
                    }}
                    broadcastTransaction={false}
                    options={{ autoShowModal: false }}
                  >
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      setIsMinting={val => setIsUserMinting(val)}
                      onMint={onMint}
                      isActive={isActive || (isPresale && isWhitelistUser)}
                    />
                  </GatewayProvider>
                ) : (
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    setIsMinting={val => setIsUserMinting(val)}
                    onMint={onMint}
                    isActive={isActive || (isPresale && isWhitelistUser)}
                  />
                )}
              </MintContainer>
            </>
          )}
        
        </div>
      </Container>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>

        <a href="/find-us-on" id="find-us-on">
          FIND US ON
        </a>
        <div id="lost-item">
          <button>
            MagicEden{" "}
            <MdOpenInNew
              style={{
                marginLeft: "1rem",
              }}
              size="25"
            />
          </button>
          <button>
            Solanart{" "}
            <MdOpenInNew
              style={{
                marginLeft: "1rem",
              }}
              size="25"
            />
          </button>
        </div>
      </div>
      <div id="about" >
        <h1 style={{paddingTop:"10rem"}}>ABOUT THE PROJECT</h1>
        <div className="content">
          <p>
            The Lost Solz are the first NFTs minted on the Solana Blockchain
            that are both Dynamic and Degenerative. They represent a bridge
            between the real and virtual worlds - providing value to their
            owners through the Lost Solz Collective. But be warned: the majority
            of Lost Solz will incur damages when resold that will affect their
            ability to collect dividends
          </p>
          <br />
          <p>
            The Lost Solz Collective is a mini VC fund that seeks to provide
            value to members through investments into both digital and real
            world assets. The Collective is funded through 50% of net proceeds
            from mint sales, as well as royalties collected from future
            secondary sales. It is our intention that the Collective evolves
            into a community led DAO fund sooner rather than later.
          </p>
          <br />
          <p>
            For more information on the investment roadmap and long-term vision
            <a href="/click-here"> CLICK HERE</a>
          </p>
          <br />
          <p>
            Membership in the Lost Solz Collective is based on the sum of the
            Collective Scores (CS) for each Lost Solz NFT held. The initial CS
            for each of the Lost Solz begins at 10 which equals a Total CS (TCS)
            of 100,000 for the Collective (i.e. each NFT representing 1/100,000
            or 0.01%)
          </p>
        </div>
      </div>
      <div id="nft">
        <h1 style={{paddingTop:"10rem"}}>THE NFTS</h1>
        <p style={{ fontSize: "1.1rem" }}>
          There are two upcoming series to be released for the Lost Solz
          project: Series 1 (limited to 100) and Series 2 (limited to 9,900).
        </p>
        <div className="lost-solz-project">
          <h2>S1 LOST SOLZ (MAQUETTE)</h2>
          <p style={{ fontSize: "1.1rem" }}>
            S1 Lost Solz are a collection of 100 unique NFTs that serves as the
            blueprint of the project - as such, their eyes are carved with an
            ‘M’ for Maquette. S1 represents the flagship assets for the project
            as well, as they feature unique attributes that allow them to
            generate greater revenue than S2.
          </p>
          <ul style={{ fontSize: "1.1rem" }}>
            <li>Share in 2.5% of S2 mint sales</li>
            <li>Share in 2.5% royalties from S2 secondary sales</li>
            <li>CS of 10</li>
            <li>
              NO damage to the NFT is inflicted upon resale (more on this later)
            </li>
            <li> NO royalties are charged for secondary sales</li>
          </ul>
          <div className="sample-nft-img">
            <img src={nftING} alt="" />
            <img src={nftING} alt="" />
            <img src={nftING} alt="" />
          </div>
        </div>
        <div className="lost-solz-project">
          <h2>S2 LOST SOLZ </h2>
          <p style={{ fontSize: "1.1rem" }}>
            S2 Lost Solz are a collection of 9,900 unique NFTs that draw
            inspiration from “lost souls” in popular culture (movies, music,
            sports, tv). Unlike S1, these characters will incur damage each time
            they are resold.
          </p>
          <ul style={{ fontSize: "1.1rem" }}>
            <li>
              CS deteriorates after each secondary sale
              <ul>
                <li>Minted: CS 10</li>
                <li>After 1 Sale ($ Eye): CS 8</li>
                <li>After 2 Sales (Scratch): CS 6</li>
                <li>After 3 Sales (Crack): CS 4</li>
                <li>After 4+ Sales (Burn): CS 2</li>
              </ul>
            </li>

            <li>
              Royalties of 10% for secondary sales
              <ul>
                <li> 5% to the Lost Solz Collective </li>
                <li> 2.5% to S1 holders </li>
                <li>2.5% to NFT creators for marketing and promotions</li>
              </ul>
            </li>
          </ul>
          <div className="sample-nft-img">
            <img src={nftImg1} alt="" />
            <img src={nftImg3} alt="" />
            <img src={nftImg1} alt="" />
          </div>
        </div>
      </div>
      <div id="team">
        <h1 style={{paddingTop:"10rem"}}>Team</h1>
        <div className="team-members">
          {teamData.map(({ photo, name, desc }) => (
            <div className="member">
              <img src={photo} alt="" height="200px" />
              <div className="name">{name}</div>
              <div>{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div id="team">
        <h1 style={{paddingTop:"10rem"}}>Advisors</h1>
        <div className="team-members">
          {advisorsData.map(({ photo, name, desc }) => (
            <div className="member">
              <img src={photo} alt="" height="200px" />
              <div className="name">{name}</div>
              <div>{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="container" id="roadmap">
        <h1 style={{paddingTop:"5rem"}}>ROADMAP</h1>
        <div className="timeline">
          <ul>
            <li>
              <div style={{ textAlign: "left" }} className="timeline-content">
                <h1 style={{ textAlign: "left" }}>Phase 1</h1>
                <p>
                  • Mint S1 Lost Solz (100 NFTs)
                  <br />
                  <br />
                  • List on Magic Eden and Solanar <br />
                  <br />
                  • List on Howrare.is or Tokensense.io, depending on Solana
                  compatibility) <br />
                  <br />
                  • Create treasury and develop smart contracts for the Lost
                  Solz Collective which will reward long-term holders and
                  disincentivize short-term profit taking <br /> <br />• Smart
                  contracts with degenerative feature that rewards long-term
                  holders and creates disincentives for short-term profit taking
                </p>
              </div>
            </li>
            <li>
              <div style={{ textAlign: "left" }} className="timeline-content">
                <h1 style={{ textAlign: "left" }}>Phase 2</h1>
                <p>
                  • Public campaigns (promotions, giveaways, collaborations) to
                  raise awareness of project <br />
                  <br />
                  • Establish partnerships to identify and create business
                  opportunities - enabling the Lost Solz Collective to
                  immediately capitalize once funded <br /> <br />• Release
                  Whitelist mint requirements for S2 mint (9,900 NFTs)
                </p>
              </div>
            </li>
            <li>
              <div style={{ textAlign: "left" }} className="timeline-content">
                <h1 style={{ textAlign: "left" }}>Phase 3</h1>
                <p>• Whitelist and public mint for S2</p>
              </div>
            </li>
            <li>
              <div style={{ textAlign: "left" }} className="timeline-content">
                <h1 style={{ textAlign: "left" }}>Phase 4</h1>
                <p>
                  • Investment roadmap begins to bring value and passive income
                  to NFT holders
                  <br />
                  <br />• Evolve the Lost Solz Collective to operate as a true
                  DAO
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div className="faq">
        <h1>FAQ</h1>
        <div className="col">
          <div className="tabs">
            <div className="tab">
              <input type="radio" id="rd1" name="rd" />
              <label className="tab-label" htmlFor="rd1">
                What blockchain are the Lost Solz be on?
              </label>
              <div className="tab-content">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eos,
                facilis.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd2" name="rd" />
              <label className="tab-label" htmlFor="rd2">
                How many Lost Solz NFTs will there be?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd3" name="rd" />
              <label className="tab-label" htmlFor="rd3">
                What will the project revenue be used for?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd4" name="rd" />
              <label className="tab-label" htmlFor="rd4">
                What will the Lost Solz Collective invest in?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd5" name="rd" />
              <label className="tab-label" htmlFor="rd5">
                What is the Collective Score and Total Collective Score?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd6" name="rd" />
              <label className="tab-label" htmlFor="rd6">
                What do the damages mean for the Collective Score?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd7" name="rd" />
              <label className="tab-label" htmlFor="rd7">
                How can I mint or buy a Lost Solz NFT?
              </label>
              <div className="tab-content">
                Series 1 Lost Solz are currently listed on Magic Eden and
                Solanart. Series 2 Lost Solz can be minted directly from the
                link above. The mint date and price is TBD
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer">
        <div style={{display:"flex", alignItems:"flex-start", flexDirection:"column", padding:"0"}}>
          <h1 style={{margin:"0", padding:"0"}}>Contact</h1>
          <p  style={{margin:"0", fontSize:"1.2rem"}}>contact@thelostsolz.com</p>
        </div>
        <div className="logo">LS</div>
        <div style={{display:"flex", alignItems:"flex-start", flexDirection:"column", padding:"0"}}>
          <h1>Follow</h1>
          <div className="contacts" style={{margin:"0", padding:"0"}}>
            <div className="social-icon" style={{marginLeft:"0"}}>
              <BsDiscord />
            </div>
            <div className="social-icon">
              <BsTwitter />
            </div>
            <div className="social-icon">
              <BsInstagram />
            </div>
            <div className="social-icon">
              <SiTiktok />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getCountdownDate = (
  candyMachine: CandyMachineAccount,
): Date | undefined => {
  if (
    candyMachine.state.isActive &&
    candyMachine.state.endSettings?.endSettingType.date
  ) {
    return toDate(candyMachine.state.endSettings.number);
  }

  return toDate(
    candyMachine.state.goLiveDate
      ? candyMachine.state.goLiveDate
      : candyMachine.state.isPresale
      ? new anchor.BN(new Date().getTime() / 1000)
      : undefined,
  );
};

export default Home;
