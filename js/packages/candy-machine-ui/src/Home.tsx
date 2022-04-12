import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';

import styled from 'styled-components';
import { Container, Snackbar } from '@material-ui/core';
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
import meimg from "./assets/image/ME_logo.png";

const ConnectButton = styled(WalletDialogButton)`
  margin-top: 2rem;
  margin-bottom: 4rem;
  padding: 1rem 2rem;
  color: white;
  border-top-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  font-size: 24px;
  font-weight: bold;
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
  const [openedFaq, setOpenedFaq] = useState<String>("");
  const hanldeFaq = (e: any) => {
    if (openedFaq === e.target.id) {
      // console.log("close");
      setOpenedFaq("");
    } else {
      // console.log("open");
      setOpenedFaq(e.target.id)
    }
    // console.log(e.target.id);
  }
  

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
        if (e instanceof Error) {
          if (e.message === `Account does not exist ${props.candyMachineId}`) {
            setAlertState({
              open: true,
              message: `Couldn't fetch candy machine state from candy machine with address: ${props.candyMachineId}, using rpc: ${props.rpcHost}! You probably typed the REACT_APP_CANDY_MACHINE_ID value in wrong in your .env file, or you are using the wrong RPC!`,
              severity: 'error',
              noHide: true,
            });
          } else if (e.message.startsWith('failed to get info about account')) {
            setAlertState({
              open: true,
              message: `Couldn't fetch candy machine state with rpc: ${props.rpcHost}! This probably means you have an issue with the REACT_APP_SOLANA_RPC_HOST value in your .env file, or you are not using a custom RPC!`,
              severity: 'error',
              noHide: true,
            });
          }
        } else {
          setAlertState({
            open: true,
            message: `${e}`,
            severity: 'error',
            noHide: true,
          });
        }
        console.log(e);
      }
    } else {
      setAlertState({
        open: true,
        message: `Your REACT_APP_CANDY_MACHINE_ID value in the .env file doesn't look right! Make sure you enter it in as plain base-58 address!`,
        severity: 'error',
        noHide: true,
      });
    }
  }, [anchorWallet, props.candyMachineId, props.connection, props.rpcHost]);

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
    <div id="landingPage">
      <div className="navbar">
        <div className='left'> <span className="logo">LS</span> </div>
        <div style={{textAlign:"center"}} className="mid">
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
        <div className="contacts right">
          <div className="social-icon">
            <a href="https://www.google.com">
            <BsDiscord size="25" /></a>
          </div>
          <div className="social-icon">
          <a href="https://www.google.com">
            <BsTwitter size="25" /></a>
          </div>
          <div className="social-icon">
          <a href="https://www.google.com">
            <BsInstagram size="25" /></a>
          </div>
          <div className="social-icon">
          <a href="https://www.google.com">
            <SiTiktok size="25" /> </a>
          </div>
        </div>
      </div>
      <div className="hero" id="home">
        <h1 style={{fontFamily: "Alegreya",fontSize:"31.5px", marginTop:"8rem", color:"#f5f5f5"}}>SERIES 2 COMING SOON</h1>
        <Container maxWidth="xs" style={{
          position: 'relative', display: "flex", alignItems: "center",  justifyContent:"center"
        }}>
        <div>
          {!wallet.connected ? (
            <ConnectButton style={{fontSize:"18px",fontFamily: "Alegreya, sans-serif" }}>Connect Wallet</ConnectButton>
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
        autoHideDuration={alertState.noHide ? null : 6000}
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
          <img src={meimg} width="35.351" height="35.351" alt="" />

            <span> MagicEden
            </span><MdOpenInNew
              style={{
                marginLeft: "0.7rem",
                padding: "6px",
                borderRadius: "50%",
                background: "white",
                color:"grey"
              }}
              size="35"
            />
          </button>
          <button>
          <svg xmlns="http://www.w3.org/2000/svg" width="35.351" height="35.351" viewBox="0 0 41.351 41.351">
  <g id="d4g2kks3qesuov391mzq" transform="translate(1.5 1.5)">
    <path id="Path_6" data-name="Path 6" d="M339.832,728.209a20.817,20.817,0,0,0,11.871,9.809c5.267,1.714,8.6.542,13.249-1.639-5.11.461-8.648.42-13.011-2.991a20.793,20.793,0,0,1-5.77-7.01A20.93,20.93,0,0,0,339.832,728.209Z" transform="translate(-334.27 -708.248)" fill="#d81ffa"/>
    <path id="Path_7" data-name="Path 7" d="M340.256,720.618a20.792,20.792,0,0,0,5.773,7.007c4.363,3.411,7.9,3.451,13.011,2.991-4.96-1.315-8.272-2.565-11.2-7.261a20.838,20.838,0,0,1-1.372-2.577A20.818,20.818,0,0,0,340.256,720.618Z" transform="translate(-328.371 -702.488)" fill="#e167ff"/>
    <path id="Path_8" data-name="Path 8" d="M807.031,498.03a20.816,20.816,0,0,1,6.207.162,20.736,20.736,0,0,1-1.659-5.985,20.907,20.907,0,0,0-6.567-.443A20.841,20.841,0,0,0,807.031,498.03Z" transform="translate(-795.146 -479.9)" fill="#0057ff"/>
    <path id="Path_9" data-name="Path 9" d="M342.024,517.208a21.286,21.286,0,0,1,2.829.709c5.267,1.714,7.276,4.632,9.746,9.129-.782-5.075-1.673-8.5-6.037-11.911a20.824,20.824,0,0,0-8.2-3.912,20.743,20.743,0,0,0,1.659,5.985Z" transform="translate(-323.931 -498.915)" fill="#189fff"/>
    <path id="Path_10" data-name="Path 10" d="M314.09,274.83a20.823,20.823,0,0,1,8.2,3.912c4.363,3.411,5.255,6.836,6.037,11.911,1-5.038,1.332-8.561-1.6-13.257a20.846,20.846,0,0,0-12.383-9.14A20.947,20.947,0,0,0,314.09,274.83Z" transform="translate(-297.656 -262.522)" fill="#17ef97"/>
    <path id="Path_11" data-name="Path 11" d="M75.593,94.769A19.175,19.175,0,1,1,94.769,75.593,19.175,19.175,0,0,1,75.593,94.769Z" transform="translate(-56.418 -56.418)" fill="none" stroke="#fff" stroke-miterlimit="10" stroke-width="3"/>
  </g>
</svg>
<span>
Solanart</span>
            <MdOpenInNew
         style={{
          marginLeft: "0.7rem",
          padding: "6px",
          borderRadius: "50%",
          background: "white",
          color:"grey"
        }}
        size="35"
            />
          </button>
        </div>
      </div>
      <div id="about" >
        <h1 className="section-heading">ABOUT THE PROJECT</h1>
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
            For more information on the investment roadmap and long-term vision{" "}
            <a style={{color:"white", fontWeight:"bold"}} href="/click-here">CLICK HERE</a>
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
        <h1 className="section-heading">THE NFTS</h1>
        <p style={{ fontSize: "18px", lineHeight:"1.7" , fontFamily:"Poppins,sans-serif", marginBottom:"1rem" }}>
          There are two upcoming series to be released for the Lost Solz
          project: Series 1 (limited to 100) and Series 2 (limited to 9,900).
        </p>
        <div className="lost-solz-project">
          <h2>S1 LOST SOLZ (MAQUETTE)</h2>
          <br></br>
          <p style={{ fontSize: "21px" }}>
            S1 Lost Solz are a collection of 100 unique NFTs that serves as the
            blueprint of the project - as such, their eyes are carved with an
            ‘M’ for Maquette. S1 represents the flagship assets for the project
            as well, as they feature unique attributes that allow them to
            generate greater revenue than S2.
          </p>
          <ul style={{ fontSize: "21px" }}>
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
          <br></br>
          <p style={{ fontSize: "21px" }}>
            S2 Lost Solz are a collection of 9,900 unique NFTs that draw
            inspiration from “lost souls” in popular culture (movies, music,
            sports, tv). Unlike S1, these characters will incur damage each time
            they are resold.
          </p>
          <br></br>
          <ul style={{ fontSize: "21px" }}>
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
      <div className="team-container" id="team">
        <h1 className="section-heading">TEAM</h1>
        <div className="team-members">
          {teamData.map(({ photo, name, desc }, index) => (
            <div className="member" key={index}>
              <img src={photo} alt="" height="200px" />
              <div  className="name">{name}</div>
              <div className='desc'>{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="team-container">
        <h1 className="section-heading">Advisors</h1>
        <div className="team-members">
          {advisorsData.map(({ photo, name, desc },index) => (
            <div className="member" key={index}>
              <img src={photo} alt="" height="200px" />
              <div className="name">{name}</div>
              <div className='desc'>{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="container" id="roadmap">
        <h1 className="section-heading">ROADMAP</h1>
        <div className="timeline">
          <ul>
            <li>
              <div style={{ textAlign: "left" }} className="timeline-content">
                <h1 style={{ textAlign: "left" }}>PHASE 1</h1>
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
                <h1 style={{ textAlign: "left" }}>PHASE 2</h1>
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
                <h1 style={{ textAlign: "left" }}>PHASE 3</h1>
                <p>• Whitelist and public mint for S2</p>
              </div>
            </li>
            <li>
              <div style={{ textAlign: "left" }} className="timeline-content">
                <h1 style={{ textAlign: "left" }}>PHASE 4</h1>
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
        <h1 className="section-heading">FAQ</h1>
        <div className="col">
          <div className="tabs">
            <div className="tab">
              <input type="radio" id="rd1" name="rd" value="rd1" onClick={hanldeFaq}/>
              <label className="tab-label" htmlFor="rd1">
                What blockchain are the Lost Solz be on?
              </label>
              <div className="tab-content">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eos,
                facilis.
                
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd2" name="rd" value="rd2"  onClick={hanldeFaq}/>
              <label className="tab-label" htmlFor="rd2">
                How many Lost Solz NFTs will there be?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd3" name="rd" value="rd3" onClick={hanldeFaq}/>
              <label className="tab-label" htmlFor="rd3">
                What will the project revenue be used for?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab"> 
              <input type="radio" id="rd4" name="rd" value="rd4" onClick={hanldeFaq} />
              <label className="tab-label" htmlFor="rd4">
                What will the Lost Solz Collective invest in?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd5" name="rd" value="rd5" onClick={hanldeFaq}/>
              <label className="tab-label" htmlFor="rd5">
                What is the Collective Score and Total Collective Score?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd6" name="rd" value="rd6" onClick={hanldeFaq} />
              <label className="tab-label" htmlFor="rd6" >
                What do the damages mean for the Collective Score?
              </label>
              <div className="tab-content">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil,
                aut.
                                
              </div>
            </div>
            <div className="tab">
              <input type="radio" id="rd7" name="rd"  value="rd7"  onClick={hanldeFaq}/>
              <label className="tab-label" htmlFor="rd7" >
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
          <h1 style={{margin:"0", padding:"0", fontSize:"31px", color:"white"}}>Contact</h1>
          <p  style={{margin:"0", fontSize:"1.5rem"}}>contact@thelostsolz.com</p>
        </div>
        <div className="logo">LS</div>
        <div style={{display:"flex", alignItems:"center", flexDirection:"column", padding:"0"}}>
          <h1 style={{margin:"0", padding:"0", fontSize:"31px",color:"white"}}>Follow</h1>
          <div  className='footer-contact' style={{margin:"0", padding:"0", display:"flex", justifyContent:"space-between",}}>
            <div className="social-icon" style={{ marginLeft: "0" }}>
            <a href="https://www.google.com">
              <BsDiscord size="25"  /></a>
            </div>
            <div className="social-icon">
            <a href="https://www.google.com">
              <BsTwitter size="25" /></a>
            </div>
            <div className="social-icon">
            <a href="https://www.google.com">
              <BsInstagram size="25" /></a>
            </div>
            <div className="social-icon">
            <a href="https://www.google.com">
              <SiTiktok size="25" /></a>
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
