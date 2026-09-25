//#include <iostream.h>
/*  
*/

void jukebox::init()
{

this->resize( 919, 632 );

setDefaultConf();
readConfXml();

backMusicTimer = new QTimer( this );
connect( backMusicTimer, SIGNAL( timeout() ), this, SLOT( backMusicSlot() ) );

startConfigure();

back2BaseTimer = new QTimer( this );
connect( back2BaseTimer, SIGNAL( timeout() ), this, SLOT( back2BaseSlot() ) );

autoHaltTimer = new QTimer( this );
connect( autoHaltTimer, SIGNAL( timeout() ), this, SLOT( autoHaltSlot() ) );
autoHaltTimer->start( 60000, false );

keyPadTimer = new QTimer( this );
connect( keyPadTimer, SIGNAL( timeout() ), this, SLOT( keyPadSlot() ) );
keyPadTimer->start( 10, false );

QAccel *accelUp = new QAccel( this );
accelUp->connectItem( accelUp->insertItem( Key_Up ), this, SLOT( upSlot() ) );

QAccel *accelDown = new QAccel( this );
accelDown->connectItem( accelDown->insertItem( Key_Down ), this, SLOT( downSlot() ) ); 

QAccel *accelPlayChoose = new QAccel( this );
accelPlayChoose->connectItem( accelPlayChoose->insertItem( Key_Return ), this, SLOT( playChooseSlot() ) ); 

QAccel *accelStop = new QAccel( this );
accelStop->connectItem( accelStop->insertItem( Key_Escape ), this, SLOT( stopSlot() ) );

QAccel *accelVolUp = new QAccel( this );
accelVolUp->connectItem( accelVolUp->insertItem( Key_Right ), this, SLOT( volUpSlot() ) ); 

QAccel *accelVolDown = new QAccel( this );
accelVolDown->connectItem( accelVolDown->insertItem( Key_Left ), this, SLOT( volDownSlot() ) ); 

QAccel *accelAddCoin = new QAccel( this );
accelAddCoin->connectItem( accelAddCoin->insertItem( Key_F1 ), this, SLOT( addCoinSlot() ) ); 

QAccel *accelBack2Base = new QAccel( this );
accelBack2Base->connectItem( accelBack2Base->insertItem( Key_Backspace ), this, SLOT( backSlot() ) ); 

QAccel *accelResetCounter = new QAccel( this );
accelResetCounter->connectItem( accelResetCounter->insertItem( Key_R ), this, SLOT( resetCounterSlot() ) );  

QAccel *accelShowCounter = new QAccel( this );
accelShowCounter->connectItem( accelShowCounter->insertItem( Key_C ), this, SLOT( showCounterSlot() ) );   

QAccel *accelSATCounter = new QAccel( this ); 
accelSATCounter->connectItem( accelSATCounter->insertItem( Key_A ), this, SLOT( showAllTimeCounterSlot() ) );

QAccel *accelLeftBalance = new QAccel( this );
accelLeftBalance->connectItem( accelLeftBalance->insertItem( Key_F2 ), this, SLOT( leftBalanceSlot() ) ); 

QAccel *accelRightBalance = new QAccel( this );
accelRightBalance->connectItem( accelRightBalance->insertItem( Key_F3 ), this, SLOT( rightBalanceSlot() ) );   

QAccel *accelExit = new QAccel( this );
accelExit->connectItem( accelExit->insertItem( Key_Q ), this, SLOT( closeJBSlot() ) );

QAccel *accelHalt = new QAccel( this );
accelHalt->connectItem( accelHalt->insertItem( Key_H ), this, SLOT( haltSlot() ) );

QAccel *accelSync = new QAccel( this );
accelSync->connectItem( accelSync->insertItem( Key_S ), this, SLOT( syncSlot() ) );

QAccel *accelSync1 = new QAccel( this );
accelSync1->connectItem( accelSync1->insertItem( Key_P ), this, SLOT( syncStdoutSlot() ) );

displayDir( cnfSoundDir, true );
runningString();

}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Outputs error messages
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::jbError( QString message, QString type )
{

/*
if ( type == "warning" ) QMessageBox::warning(this, 
		"JukeBox", local_codec->toUnicode( message ), QMessageBox::Ok,0);
else if ( type == "error" ) QMessageBox::critical(this, 
		"JukeBox", local_codec->toUnicode ( message ), QMessageBox::Ok,0);
*/
if ( type == "warning" ) nameLabel->setText( "Warning: " +  message );
else if ( type == "error" ) nameLabel->setText( "Error: " +  message );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Configures jukebox at start
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::startConfigure()
{

currentDir = cnfSoundDir;
programDir = QDir::currentDirPath() + "/";

isMenu = false;
keyPadLastNum=0;
keyPadSleep=0;
keyPSFirst=true;
rsPos1 = 0;					//position of running string1
rsPos2 = 0;					//position of running string2
coins=0;        				//number of coins
turn=0;        					//number of songs in turn
isHalted=false;
stop=false;
stopBM=false;
play_a_stop=false;
freeCredits = false;
isPlaying="";
codec = QTextCodec::codecForName( "CP1251" );
local_codec = QTextCodec::codecForName( "KOI8-U" );
proc = new QProcess( this );
procBM = new QProcess( this );
bmNum = 0;
backMusicLoad();
reklamaLoad();
reklamaSlot();
gifLabelShown = false;
ardMovie = QMovie( cnfArdPixmap );
arMovie = QMovie( cnfArPixmap );
aruMovie = QMovie( cnfAruPixmap );
ardMovie.setSpeed( 50 );
arMovie.setSpeed( 50 );
aruMovie.setSpeed( 50 );
currentDir = cnfSoundDir;
prevSelected = currentDir.right( currentDir.length() - currentDir.findRev('/')-1 );

hint = new Hint;
hint->setFrameStyle(QFrame::Panel | QFrame::Plain);
hint->setLineWidth(1);
hint->setAlignment(SingleLine);
hint->setPaletteBackgroundColor( cnfHbColor );
hint->setPaletteForegroundColor( cnfHfColor );
hint->setFont(playList->font());

QPixmap * jukeBoxPix = new QPixmap( JukeBox_xpm );
this->setIcon( *jukeBoxPix );

QImage *imagePL = new QImage( cnfPlbPixmap );
playList->setPaletteForegroundColor(cnfPltColor);
playList->setStaticBackground(true);
playList->setPaletteBackgroundPixmap(QPixmap(imagePL->scale( 310, 768, QImage::ScaleFree)) );
delete imagePL;

QImage *imageF1 = new QImage( cnfBgPixmap );
frame1->setPaletteBackgroundPixmap( imageF1->scale( 712, 180, QImage::ScaleFree ) );
delete imageF1;

ucounterLabel->setText("");
counterLabel->setText("");
turnLabel1->setText("");
turnLabel2->setText("");
turnLabel3->setText("");
nameLabel->setText("");
gifLabel->setMovie( ardMovie );

restoreVolume();

restore();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Reads configuration from file.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::readConfXml()
{

QDomDocument domConfXml("conf");
QFile fileConfXml("/mnt/data/JBFiles/system/conf.xml");

if ( ! fileConfXml.open(IO_ReadOnly) )
{
    nameLabel->setText( "Error: Could't found " + fileConfXml.name() + 
                                          " file. The default configuring values will be set!" );
	setDefaultConf();
	return;
}

if ( ! domConfXml.setContent( &fileConfXml ) )
{
	jbError( "There are errors in 'conf.xml' file! The default configuring values will be set!", "warning" );
	fileConfXml.close();
	setDefaultConf();
	return;
}
fileConfXml.close();

QDomElement domStartElement = domConfXml.documentElement();
if ( "JukeBox" != domStartElement.tagName() )
{
	jbError( "There are errors in 'conf.xml' file! The default configuring values will be set!", "warning" );
	setDefaultConf();
	return;
}
else
{
	unsigned short tmpR = 0;
	unsigned short tmpG = 0;
	unsigned short tmpB = 0;
	unsigned short tmpH = 0;
	unsigned short tmpM = 0;
	QDomElement domCurElement1;
	QDomElement domCurElement2;
	QDomNode domNode2;
	QDomNode domNode1 = domStartElement.firstChild();
	while ( ! domNode1.isNull() )
	{
		if ( domNode1.isElement() )
		{
			domCurElement1 = domNode1.toElement();
			
			if ( "boxName" == domCurElement1.tagName() )	
				cnfBoxName = domCurElement1.text().stripWhiteSpace();
			if ( "soundDir" == domCurElement1.tagName() ) 
				cnfSoundDir = domCurElement1.text().stripWhiteSpace();
			if ( "reklamaDir" == domCurElement1.tagName() ) 
				cnfReklamaDir = domCurElement1.text().stripWhiteSpace();
			if ( "reklamaTime" == domCurElement1.tagName() ) 
				cnfReklamaTime = domCurElement1.text().stripWhiteSpace().toUInt();
			if ( "bgmDir" == domCurElement1.tagName() ) 
				cnfBGMDir = domCurElement1.text().stripWhiteSpace();
			if ( "bgPixmap" == domCurElement1.tagName() ) 
				cnfBgPixmap = domCurElement1.text().stripWhiteSpace();
			if ( "ardPixmap" == domCurElement1.tagName() ) 
				cnfArdPixmap = domCurElement1.text().stripWhiteSpace();
			if ( "arPixmap" == domCurElement1.tagName() ) 
				cnfArPixmap = domCurElement1.text().stripWhiteSpace();
			if ( "aruPixmap" == domCurElement1.tagName() ) 
				cnfAruPixmap = domCurElement1.text().stripWhiteSpace();
			if ( "plbPixmap" == domCurElement1.tagName() ) 
				cnfPlbPixmap = domCurElement1.text().stripWhiteSpace();
			if ( "bmTime" == domCurElement1.tagName() ) 
				cnfBmTime = domCurElement1.text().stripWhiteSpace().toUShort();
			if ( "bmNum" == domCurElement1.tagName() ) 
				cnfBmNum = domCurElement1.text().stripWhiteSpace().toUShort();
			if ( "nfCredits" == domCurElement1.tagName() ) 
				cnfNfCredits = domCurElement1.text().stripWhiteSpace().toUShort();
			if ( "msText" == domCurElement1.tagName() ) 
				cnfMsText = domCurElement1.text().stripWhiteSpace();
			if ( "msSpeed" == domCurElement1.tagName() )
				cnfMsSpeed = domCurElement1.text().stripWhiteSpace().toUShort();
			if ( "ssFile" == domCurElement1.tagName() ) 
				cnfSsFile = domCurElement1.text().stripWhiteSpace();
			if ( "ssVisible" == domCurElement1.tagName() ) 
				cnfSsVisible = domCurElement1.text().stripWhiteSpace().toUShort();
			if ( "ssInvisible" == domCurElement1.tagName() ) 
				cnfSsInvisible = domCurElement1.text().stripWhiteSpace().toUShort();
			if ("msbColor" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfMsbColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ("msfColor" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfMsfColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ("hfColor" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfHfColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ("hbColor" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfHbColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ( "pltColor" == domCurElement1.tagName() )	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfPltColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ("clColor" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfClColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ("uclColor" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "r" == domCurElement2.tagName() ) 
							tmpR = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "g" == domCurElement2.tagName() ) 
							tmpG = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "b" == domCurElement2.tagName() ) 
							tmpB = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfUclColor.setRgb( tmpR, tmpG, tmpB );
			}
			if ("haltTime" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "h" == domCurElement2.tagName() ) 
							tmpH = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "m" == domCurElement2.tagName() ) 
							tmpM = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfHaltTime.setHMS( tmpH, tmpM, 0 );
			}
			if ("startTime" == domCurElement1.tagName())	
			{
				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "h" == domCurElement2.tagName() ) 
							tmpH = domCurElement2.text().stripWhiteSpace().toUShort();
						if ( "m" == domCurElement2.tagName() ) 
							tmpM = domCurElement2.text().stripWhiteSpace().toUShort();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfStartTime.setHMS( tmpH, tmpM, 0 );
			}

			if ("equalizer" == domCurElement1.tagName())	
			{
				QString b31Hz="0";
				QString b62Hz="0";
				QString b125Hz="0";
				QString b250Hz="0";
				QString b500Hz="0";
				QString b1kHz="0";
				QString b2kHz="0";
				QString b4kHz="0";
				QString b8kHz="0";
				QString b16kHz="0";

				domNode2 = domCurElement1.firstChild();
				while ( ! domNode2.isNull() )
				{
					if ( domNode2.isElement() )
					{
						domCurElement2 = domNode2.toElement();
						if ( "b31Hz" == domCurElement2.tagName() ) 
							b31Hz = domCurElement2.text().stripWhiteSpace();
						if ( "b62Hz" == domCurElement2.tagName() ) 
							b62Hz = domCurElement2.text().stripWhiteSpace();
						if ( "b125Hz" == domCurElement2.tagName() ) 
							b125Hz = domCurElement2.text().stripWhiteSpace();
						if ( "b250Hz" == domCurElement2.tagName() ) 
							b250Hz = domCurElement2.text().stripWhiteSpace();
						if ( "b500Hz" == domCurElement2.tagName() ) 
							b500Hz = domCurElement2.text().stripWhiteSpace();
						if ( "b1kHz" == domCurElement2.tagName() ) 
							b1kHz = domCurElement2.text().stripWhiteSpace();
						if ( "b2kHz" == domCurElement2.tagName() ) 
							b2kHz = domCurElement2.text().stripWhiteSpace();
						if ( "b4kHz" == domCurElement2.tagName() ) 
							b4kHz = domCurElement2.text().stripWhiteSpace();
						if ( "b8kHz" == domCurElement2.tagName() ) 
							b8kHz = domCurElement2.text().stripWhiteSpace();
						if ( "b16kHz" == domCurElement2.tagName() ) 
							b16kHz = domCurElement2.text().stripWhiteSpace();
					}
					domNode2 = domNode2.nextSibling();
				}
				cnfEqualizer = QString( "equalizer=%1:%2:%3:%4:%5:%6:%7:%8:%9:" )
										.arg(b31Hz)
										.arg(b62Hz)
										.arg(b125Hz)
										.arg(b250Hz)
										.arg(b500Hz)
										.arg(b1kHz)
										.arg(b2kHz)
										.arg(b4kHz)
										.arg(b8kHz) + b16kHz;
			}
		}
		domNode1 = domNode1.nextSibling();
	}
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Sets default configuration when 'conf.xml' file is broken. 
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::setDefaultConf()
{

cnfBoxName = "unknownBox1";
cnfSoundDir = "./defaults/music";
cnfBGMDir = "./defaults/BackMusic/";
cnfReklamaDir = "./defaults/Reklama";
cnfReklamaTime = 10;
cnfBgPixmap = "./defaults/bg.jpg";
cnfArdPixmap = "./defaults/arrow.gif";
cnfArPixmap = "./defaults/arrow.gif";
cnfAruPixmap = "./defaults/arrow.gif";
cnfPlbPixmap = "./defaults/pl.jpg";
cnfBmTime = 1;
cnfPltColor.setRgb( 180, 180, 180 );
cnfClColor.setRgb( 0, 0, 0 );
cnfUclColor.setRgb( 0, 0, 0 );
cnfHaltTime.setHMS( 0, 0, 0 );
cnfStartTime.setHMS( 18, 0, 0 );
cnfBmNum = 2;
cnfNfCredits = 10;
cnfMsText = "JukeBox by sheva:  shevchyk@gmail.com";
cnfMsSpeed = 1;
cnfMsfColor.setRgb( 255, 255, 255 );
cnfMsfColor.setRgb( 0, 0, 0 );
cnfHfColor.setRgb( 180, 180, 180 );
cnfHbColor.setRgb( 0, 0, 0 );
cnfSsFile = "./defaults/ss.avi";
cnfSsVisible = 30;
cnfSsInvisible = 30;
cnfEqualizer = "equalizer=12:12:10:5:0:-12:0:5:12:12";

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Display in playList all files and directories from the folder 'dir'. 
It filters only *.mp3 files and display them without extenssion.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::displayDir( QString dir, bool selFirst )
{

playList->clear();

local_codec = QTextCodec::codecForName( "KOI8-U" );
QPixmap * notaPix = new QPixmap( nota_xpm ); 	//pixmap from pixmaps.h
QDir d( dir );
d.setFilter( QDir::TypeMask );
d.setSorting( QDir::DirsFirst );
const QFileInfoList * list = d.entryInfoList();
QFileInfoListIterator it( * list );
QFileInfo *fi;

while ( (fi = it.current()) != 0 )
{
	if ( fi->fileName()!="." )
	{
		if ( fi->isDir() ) 
		{
			if ( fi->fileName() != ".." ) playList->insertItem( fi->fileName(), -1 );
		}
		else if ( fi->fileName().section( '.',-1 ) == "mp3" | fi->fileName().section( '.',-1 ) == "MP3" | 
					 fi->fileName().section( '.',-1 ) == "Mp3" | fi->fileName().section( '.',-1 ) == "mP3" ) 
		{
			QString nam=fi->fileName();	
			nam.truncate( nam.findRev( '.' ) );	
			playList->insertItem( * notaPix, nam, -1 );
		}
	}
	++it;
}


if ( playList->count() > 0 )
{
	if ( selFirst ) 
	{
		playList->setSelected( 0, true );
	}
	else 
	{
			playList->setSelected( playList->findItem( prevSelected ), true );
			playList->scrollBy(0, ( playList->currentItem() - 10 ) * playList->itemHeight( playList->currentItem() ) );
	}
}
prevSelected = currentDir.right( currentDir.length() - currentDir.findRev('/') - 1 );

displayHint();

if (( playList->numItemsVisible() < ( int ) playList->count() ) && ( 0 != playList->count() ))
{
	gifLabelShown = true;
	showGifLabel();
	gifLabel->setFixedHeight( 30 );
}
else
{	
	gifLabel->setFixedHeight(0);
	if ( aruMovie.running() ) aruMovie.pause();
	if ( arMovie.running() ) arMovie.pause();
	if ( ardMovie.running() ) ardMovie.pause();
	gifLabel->clear();
	gifLabelShown = false;
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Displays and hides gifLabel.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::showGifLabel()
{

if ( gifLabelShown )
{
	if ( playList->currentItem() == 0 )
	{
		if ( aruMovie.running() ) aruMovie.pause();
		if ( arMovie.running() ) arMovie.pause();
		gifLabel->setMovie( ardMovie );
		gifLabel->setFixedHeight( 30 );
		if ( ardMovie.paused() ) ardMovie.unpause();
	}
	else if ( playList->currentItem() == (int) playList->count() - 1 )
	{
		if ( ardMovie.running() ) ardMovie.pause();
		if ( arMovie.running() ) arMovie.pause();
		gifLabel->setMovie( aruMovie );
		gifLabel->setFixedHeight( 30 );
		if ( aruMovie.paused() ) aruMovie.unpause();
	}
	else
	{
		if ( ardMovie.running() ) ardMovie.pause();
		if ( aruMovie.running() ) aruMovie.pause();
		gifLabel->setMovie( arMovie );
		gifLabel->setFixedHeight( 30 );
		if ( arMovie.paused() ) arMovie.unpause();
	}
}

}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves cursor up.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::upSlot()
{
  
playList->setCurrentItem( playList->index( playList->selectedItem() ) - 1 );

if ( back2BaseTimer->isActive() )
{
	back2BaseTimer->stop();
	back2BaseTimer->start( 45000, true );
}
else back2BaseTimer->start( 45000, true );

displayHint();
showGifLabel();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves cursor down.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::downSlot()
{

playList->setCurrentItem( playList->index( playList->selectedItem() ) + 1 );

if ( back2BaseTimer->isActive() )
{
	back2BaseTimer->stop();
	back2BaseTimer->start( 45000, true );
}
else back2BaseTimer->start( 45000, true );

displayHint();
showGifLabel();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves cursor back to root directory.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::back2BaseSlot()
{

currentDir = cnfSoundDir;  
displayDir( cnfSoundDir, true );
if ( back2BaseTimer->isActive() ) back2BaseTimer->stop();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves cursor back parent directory.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::backSlot()
{

if ( currentDir != cnfSoundDir )
{
	currentDir.truncate( currentDir.findRev( '/' ) );
	displayDir( currentDir, false );
}

}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
 Reads current item from playList.
If this item is song, then starts playing it, if current item is directory, then  
display this directory in PlayList using 'displayDir'.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

void jukebox::playChooseSlot()
{

if ( back2BaseTimer->isActive() )
{
	back2BaseTimer->stop();
	back2BaseTimer->start( 45000, true );
}
else back2BaseTimer->start( 45000, true );

if ( playList->count() <=0 )
{
	backSlot();
	return;
}

int selIndex;          												            	//index of selected item in palyList
selIndex = playList->index( playList->selectedItem() );		//getting of this index
QString dirName = playList->text( selIndex );     				//getting the name of selected item

if ( ! play_a_stop )
{  

lab1:	 
	currentDir += "/" + dirName;

	QFileInfo fileN1( currentDir + ".mp3" );	
	QFileInfo fileN2( currentDir + ".MP3" );	
	QFileInfo fileN3( currentDir + ".Mp3" );	
	QFileInfo fileN4( currentDir + ".mP3" );	

	if ( fileN1.exists() ) currentDir=currentDir + ".mp3";			
	else if ( fileN2.exists() ) currentDir=currentDir + ".MP3";	
	else if ( fileN3.exists() ) currentDir=currentDir + ".Mp3";	
	else if ( fileN4.exists() ) currentDir=currentDir + ".mP3";	

	QFileInfo fileName( currentDir );

	if ( fileName.isDir() ) displayDir( currentDir, true );
	else if ( ( fileName.isFile() ) && ( coins > 0 ) )
	{
		if ( ! proc->isRunning() )
		{
			backMusicTimer->stop();
			playFile( currentDir );

			int num = pathList.count();
			turnLCD->display( num + 1 ); 

			currentDir.truncate( currentDir.findRev( '/' ) );
        	}
		else
		{
			addToPathList( currentDir );
			currentDir.truncate( currentDir.findRev( '/' ) );
		}
        coins--;
        coinsLCD->display( coins );
	}
	else if ( ( fileName.isFile() ) && ( coins == 0 ) ) currentDir.truncate( currentDir.findRev( '/' ) );
}
else
{
	if ( ! pathList.empty() )
	{
		playFile( pathList.last() );
		backMusicTimer->stop();

		pathList.pop_back();
		int num = pathList.count();
		turnLCD->display( num + 1 );

		displayTurn();
	}
	else
	{
		coins += 1;
		goto lab1;
	}
}
play_a_stop = false;
backUp( 'a' );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Plays the song.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::playFile(QString fileName)
{

bMStopSlot();

  
proc = new QProcess( this );
proc->addArgument( "/usr/local/bin/mplayer" );
proc->addArgument( "-novideo" );
proc->addArgument( "-af" );
proc->addArgument( cnfEqualizer );
proc->addArgument( fileName );
  
connect( proc, SIGNAL( processExited() ), this, SLOT( procSlot() ) );

if ( ! proc->start() ) jbError( "Couldn't play song!!!", "error" );

QString songName =  getId3( fileName );
nameLabel->setText( songName );
if ( ! freeCredits ) add2Reg( songName );
else
{
	cnfNfCredits--;
	if ( cnfNfCredits <= 0 ) freeCredits = false;
} 
  
isPlaying = fileName;
  
fileName.truncate( fileName.findRev( '/' ) );
QFileInfo bgFile( fileName + "/bg.jpg" );
if ( bgFile.exists() ) 
{
	QImage *image = new QImage( fileName + "/bg.jpg" );
	frame1->setPaletteBackgroundPixmap( image->scale( 712, 180, QImage::ScaleFree ) );
}
else 
{
	QImage *image = new QImage( cnfBgPixmap );
	frame1->setPaletteBackgroundPixmap( image->scale( 712, 180, QImage::ScaleFree ) );
}
 
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Starts playing process.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::procSlot()
{

if ( ( ! pathList.empty() ) && ( ! stop ) ) 
{
	playFile( pathList.last() );
	pathList.pop_back();
  
	int num = turnLCD->intValue() - 1;
	turnLCD->display( num );
}
else 
{
	nameLabel->setText("");
	backMusicTimer->start( cnfBmTime * 60000, true );
	isPlaying = "";

	int num = pathList.count();
	turnLCD->display( num ); 
}
  
stop = false;
displayTurn();
if ( ! isHalted ) backUp('a');
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Stops currently playing song.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::stopSlot()
{

if ( proc->isRunning() )
{
	proc->tryTerminate();
	QTimer::singleShot( 1000,proc,SLOT( kill() ) );
	stop = true;
	play_a_stop = true;
}
 
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Displays next three songs in turn.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::displayTurn()
{

int i = 0;
QStringList::Iterator it;
  
for ( it = pathList.begin(); it != pathList.end(); ++it ) i++;

if ( i == 0 )
{
	turnLabel1->setText("");
	turnLabel2->setText("");
	turnLabel3->setText("");
}
else if ( i == 1 )
{
	it = pathList.begin();
	turnLabel1->setText("");
	turnLabel2->setText(""); 
	turnLabel3->setText( getId3( *it ) );
}
else if ( i == 2 )
{
	it = pathList.begin();
	turnLabel1->setText("");
	turnLabel2->setText( getId3( *it ) );
	++it;
	turnLabel3->setText( getId3( *it ) );
}
else  if ( i == 3 )
{
	it = pathList.begin();
	turnLabel1->setText( getId3( *it ) );
	++it;
	turnLabel2->setText( getId3( *it ) );
	++it;
	turnLabel3->setText( getId3( *it ) );
}
else
{
	it = pathList.begin();
	it += i - 3;
	turnLabel1->setText( getId3( *it ) );
	++it;
	turnLabel2->setText( getId3( *it ) );
	++it;
	turnLabel3->setText( getId3( *it ) );
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Reads ID3 tag of *.mp3 file.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
QString jukebox::getId3( QString fileName )
{

	QChar ch;
	QString artistID3;
	QString titleID3;
	QString tagID3;
	QFile mp3File( fileName );
	
	if ( mp3File.open( IO_ReadOnly ) )
	{
		mp3File.at( mp3File.size() - 128 );		

		for ( int i=0; i<3; i++ )
		{
			ch = mp3File.getch();
			tagID3 += ch;
		}

		if ( tagID3 == "TAG" )
		{
			for ( int i=0; i<30; i++ )
			{
				ch = mp3File.getch();
				titleID3 += ch;
				
			}        

			for ( int i=0; i<30; i++ )
			{
				ch = mp3File.getch();
				artistID3 += ch;
			}

			artistID3 = artistID3.stripWhiteSpace();
			titleID3 = titleID3.stripWhiteSpace();
			while ( artistID3.endsWith( QChar( 0 ) ) ) artistID3.truncate( artistID3.length() - 1 );
			while ( titleID3.endsWith( QChar( 0 ) ) ) titleID3.truncate( titleID3.length() - 1 );

			return codec->toUnicode( artistID3 + " - " + titleID3 );
		}
		else
		{
			fileName.truncate( fileName.findRev( '.' ) );
			fileName = fileName.right( fileName.length() - fileName.findRev( '/' ) - 1 );
			
			return fileName ;
		}

		mp3File.close();
	}
	else return "Couln't open file !!!" ;

}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Adds the song to turn list.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::addToPathList( QString songStr )
{

pathList.insert( pathList.begin(), songStr );
QString str1;
  
int num = pathList.count();
turnLCD->display( num + 1 );

displayTurn();
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Backups importaint information.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::backUp(QChar ch)
{

//ch==' r ' - reset 'JukeBox.sav' 

QFile saveFile(programDir+"JukeBox.save");
if (saveFile.exists())
{
	if (saveFile.open( IO_WriteOnly | IO_Truncate ))
	{
		QTextStream stream( &saveFile );
      
		if ( ch=='r' ) 
		{
			coins = turnLCD->intValue() + coinsLCD->intValue();
			coinsLCD->display( coins );
			turnLCD->display( 0 );
			pathList.clear();
			stream << coins << "\n";
		}
		else
		{
			stream << coins << "\n";
			if ( ! isPlaying.isEmpty() ) stream << isPlaying << "\n";
			for ( QStringList::Iterator it = pathList.begin(); it != pathList.end(); ++it ) stream << *it << "\n";
		}
   
		saveFile.close();
	}
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Load BacMusic files into 'backMusicList'.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::backMusicLoad()
{

QFile back_musicFile( cnfBGMDir + "/back_music" );
if ( back_musicFile.open( IO_ReadOnly ) ) 
{
	backMusicList.clear();
	QTextStream stream( &back_musicFile );
    while ( ! stream.atEnd() ) backMusicList += stream.readLine();
	bMLIterator = backMusicList.begin();
    back_musicFile.close();
}

QDir backMusicDir( cnfBGMDir );
if ( backMusicDir.exists() )
{
	backMusicListD.clear(); 
	backMusicListD = backMusicDir.entryList( "*.[mM][pP]3" );
	bMLIteratorD = backMusicListD.begin();
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Starts playing background music.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::backMusicSlot()
{
  
backMusicTimer->stop();
 
if ( ( ( bmNum >= cnfBmNum ) || ( backMusicListD.empty() ) ) && ( ! backMusicList.empty() ) )
{
	playBM( *bMLIterator );
	if ( ++bMLIterator == backMusicList.end() ) bMLIterator = backMusicList.begin();
	bmNum = 0;
}
else
{
	playBM( cnfBGMDir + "/" + *bMLIteratorD );
	if ( ++bMLIteratorD == backMusicListD.end() ) bMLIteratorD = backMusicListD.begin();

	if ( bmNum > cnfBmNum ) bmNum = 0;
	else bmNum++;
} 

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Plays backgroundmusic.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::playBM( QString fileName )
{

procBM = new QProcess( this );
procBM->addArgument( "/usr/local/bin/mplayer" );
procBM->addArgument( "-novideo" );
procBM->addArgument( "-af" );
procBM->addArgument( cnfEqualizer );
procBM->addArgument( fileName );
  
connect( procBM, SIGNAL( processExited() ), this, SLOT( bMProcSlot() ) );
  
if ( ! procBM->start() ) jbError( "Couldn't play background music!!!", "error" );

stopBM = false;
nameLabel->setText( getId3( fileName ) );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Starts playing backgroundmusic process.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::bMProcSlot()
{
  
if ( ! stopBM ) 
{
	if ( ( ( bmNum >= cnfBmNum ) || ( backMusicListD.empty() ) ) && ( ! backMusicList.empty() ) )
	{
		playBM( *bMLIterator );
		if ( ++bMLIterator == backMusicList.end() ) bMLIterator = backMusicList.begin();
		bmNum = 0;
	}
	else
	{
		playBM( cnfBGMDir + "/" + *bMLIteratorD );
		if ( ++bMLIteratorD == backMusicListD.end() ) bMLIteratorD = backMusicListD.begin();

		if ( bmNum > cnfBmNum ) bmNum = 0;
		else bmNum++;
	}
	stopBM = false;
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Stops playing backgroundmusic.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::bMStopSlot()
{
 
if ( procBM->isRunning() )
{
	procBM->tryTerminate();
	QTimer::singleShot(1000,procBM,SLOT( kill() ) );
	stopBM = true;
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Destructor.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::destroy()
{

if (proc->isRunning())
{
	proc->tryTerminate();
	QTimer::singleShot( 1000,proc,SLOT( kill() ) );
}

if ( procBM->isRunning() )
{
	procBM->tryTerminate();
	QTimer::singleShot( 1000,proc,SLOT( kill() ) );
}
 
saveVolume();
backUp( 'a' ); 

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Adds song to registry.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::add2Reg( QString songName )
{
  
QString name, times_str;
int times = 0;
int len = 0;
int pop = 1;
bool isInReg = false;
  
QFile regFile( programDir + "JukeBox.reg" );
if ( regFile.exists() )
{
	if ( regFile.open( IO_ReadWrite ) )
	{
		pop = 1;
		isInReg = false;
      
		QTextStream stream( &regFile );
		QString line;
      
		while ( ! stream.eof() )
		{
			line = stream.readLine();
			len += line.length();
        
			times_str = line.section( '-', -1 );
			name = line;
			name.truncate( line.findRev( '-' ) );
        
			if ( name == songName )
			{
				times = times_str.section( ' ', 0, 0 ).toInt();
				times++;
          
				regFile.at( len-line.length() + line.findRev( '-' ) + pop );
				stream << times;
          
				isInReg = true;
				break;
			}
			pop++;
		}
      
		if ( ! isInReg )
		{
			regFile.at( regFile.size() );
			stream << songName <<"-1          ;\n";
		}
	}
	regFile.close();
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Manipulates with counters.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::setCounters( QChar ch )
{

  /*
This function works with counters. It understands such parameters:
'+' - increase values of both counters,
'R' - reset resetible counter and adds log string,
'A' - show AllTimeCounter,
'C' - show Counter,
'H' - hide AllTimeCounter,
'h' - hide Counter,
*/
  
QFile countersFile( programDir + "/JukeBox.counters" );
QString line, counterName;
QString strCounterValue;
int counterValue = 0;
int posInFile = 0;
int resetNumber = 0;
  
//reading counters from file
if ( countersFile.exists() )
{
	if ( countersFile.open( IO_ReadWrite ) )
	{
		QTextStream stream( &countersFile );
      
		while ( ! stream.eof() ) 
		{
			line = stream.readLine(); 
        
			if ( line == "[AllTimeCounter]" )
			{
				do
				{
					posInFile = countersFile.at();
					line = stream.readLine(); 
				}
				while ( line.isEmpty() );
          
				line.truncate( line.find( ' ', 2, false ) );
				strCounterValue = line.section( '=', -1 );
				counterValue = strCounterValue.toInt();
          
				if (ch == '+')
				{
					counterValue++;
					countersFile.at( posInFile + 2 );
					stream << counterValue;
				}
          
				if ( ch == 'A' ) ucounterLabel->setText( "AllTimeCounter = " + strCounterValue ); 
			}
        
			if ( line == "[Counter]" )
			{
				do
				{
					posInFile = countersFile.at();
					line = stream.readLine(); 
				}
				while ( line.isEmpty() );
          
				line.truncate( line.find( ' ', 2, false ) );
				strCounterValue = line.section( '=', -1 );
				counterValue = strCounterValue.toInt();
          
				if ( ch == '+' )
				{
					counterValue++;
					countersFile.at( posInFile + 2 );
					stream << counterValue;
				}
          
				if ( ch == 'R')
				{
					countersFile.at( posInFile + 2 );
					stream << "0          ";
				}
          
				if ( ch == 'C' ) counterLabel->setText( "Counter = " + strCounterValue );
			}
        
			if ( line == "[Reset]" ) resetNumber = 0;
     
			resetNumber++;
		}
      
		if ( ch == 'R')
		{
			QString year, month, day, time, date;
			date = QDateTime::currentDateTime().toString( Qt::ISODate );
			year = date.section( '-', 0, 0 );
			month = date.section( '-', 1, 1 );
			day = date.section( '-', 2, 2 );  //temporary
			time = day.section( 'T', 1, 1 );  //temporary
			day = day.section( 'T', 0, 0 );
			time = time.section( ':', 0, 1 );
        
			countersFile.at( countersFile.size() );
			stream << resetNumber << "=" << month << "." << day << "." << year << " - " << time << " - " << counterValue << "\n"; 
		}
      
		if ( ch == 'H' ) ucounterLabel->setText("");
		if ( ch == 'h' ) counterLabel->setText("");
	}

	countersFile.close();
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Resets the counter.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::resetCounterSlot()
{
  
setCounters( 'R' );
if ( counterLabel->text() != "" ) setCounters( 'C' );
  
}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Displays AllTimeCounter.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::showAllTimeCounterSlot()
{
  
if ( ucounterLabel->text() == "" )  setCounters( 'A' );
else  setCounters( 'H' );
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Displays Counter.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::showCounterSlot()
{
  
if ( counterLabel->text() == "" )  setCounters( 'C' );
else  setCounters( 'h' );
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Increases volume.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::volUpSlot()
{
 
if ( volumeLeft >= 100 | volumeRight >= 100 )
{
	volumeLeft = 100;
	volumeRight = 100;
}
else
{
	volumeLeft++;
	volumeRight++;
}

setVolume( volumeLeft, volumeRight );  

}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Decreases volume.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::volDownSlot()
{
 

if ( volumeLeft <= 0 | volumeRight <= 0 )
{
	volumeLeft = 0;
	volumeRight = 0;
}
else
{
	volumeLeft--;
	volumeRight--;
}

setVolume( volumeLeft, volumeRight );

}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves ballance to left.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::leftBalanceSlot()
{
  
if ( volumeLeft >= 100 ) volumeLeft = 100;
else volumeLeft++;
 
if ( volumeRight <= 0 ) volumeRight = 0;
else volumeRight--;

setVolume( volumeLeft, volumeRight ); 
 
}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves ballance to right.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::rightBalanceSlot()
{
  
if ( volumeLeft <= 0 ) volumeLeft = 0;
else volumeLeft--;
  
if ( volumeRight >= 100 ) volumeRight = 100;
else volumeRight++;
 
setVolume( volumeLeft, volumeRight );

}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Reads time when free credits were added last time.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::saveFreeCreditsTime()
{

QFile freeVolumeFile( programDir+"JukeBox.free" );

if ( freeVolumeFile.open( IO_WriteOnly | IO_Truncate ) )
{
	QTextStream stream( &freeVolumeFile );
	stream << QDateTime::currentDateTime().toTime_t();
	freeVolumeFile.close();
}

}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Reads time when free credits were added last time.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
bool jukebox::allowFreeCreditsTime()
{

uint lastTime = 0;
QFile freeFile( programDir+"JukeBox.free" );
if ( freeFile.exists() )
{
	if ( freeFile.open( IO_ReadOnly ) )
	{
		QTextStream stream( &freeFile );  
		lastTime = stream.readLine().toUInt();
		freeFile.close();
	}
}
else return true;

uint currentTime = QDateTime::currentDateTime().toTime_t();

if ( currentTime - lastTime > 86400) return true;
else return false;

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Restores from file saved importaint information.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::restore()
{
  
QFile saveFile( programDir+"JukeBox.save" );
if ( saveFile.exists() )
{
	if ( saveFile.open( IO_ReadOnly ) )
	{
		QTextStream stream( &saveFile );
    
		coins = stream.readLine().toInt();
		if (( cnfStartTime > QTime::currentTime() ) && ( allowFreeCreditsTime() ) )
		{
			coins += cnfNfCredits;
			freeCredits = true;
			saveFreeCreditsTime();
		}
		coinsLCD->display( coins );
   
		if ( ! stream.eof() ) playFile( stream.readLine() );
		else 
		{
			backMusicTimer->start( 3000, true );
			return;
		}
    
		while ( ! stream.eof() ) pathList.append( stream.readLine() );
    
		int num = pathList.count();
		turnLCD->display( num + 1 );
		displayTurn();
    
		saveFile.close();
	}
}
else backMusicTimer->start( 10, true );

}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Adds coin.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::addCoinSlot()
{

coins++;
coinsLCD->display( coins );

if ( back2BaseTimer->isActive() )
{
	back2BaseTimer->stop();
	back2BaseTimer->start( 45000, true );
}
else back2BaseTimer->start( 45000, true );

if ( ! freeCredits ) setCounters( '+' );
if ( counterLabel->text() !="" ) setCounters( 'C' );
if ( ucounterLabel->text() !="" ) setCounters( 'A' );

backUp( 'a' );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Exits the program.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::closeJBSlot()
{

hint->hide();
this->close();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Poweroffs device.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::haltSlot()
{

backUp( 'a' );
isHalted = true;
reklamaStopSlot();
stopSlot();
bMStopSlot();
saveVolume();
 
QProcess * procHalt = new QProcess( this );
procHalt->addArgument( "/sbin/halt" );
  
if ( ! procHalt->start() ) jbError( "Couldn't halt the system!!!", "error" );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
When name of file in is longer then width of playList, then this SLOT 
displays full name in another window.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::displayHint()
{

hint->hide();

if ( ( playList->count() > 0 ) && ( playList->selectedItem()->width( playList ) > playList->width() ))
{
	playList->ensureCurrentVisible();
	QRect itemRect = playList->itemRect( playList->selectedItem() );
	int pos = itemRect.top();
	if ( pos == -1 ) pos = itemRect.top();

	hint->setText( playList->currentText() );
	hint->adjustSize();
	hint->move(17, pos);
	hint->show();
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Runs the string on frame3.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::runningString()
{

rsCanvas = new QCanvas( frame3, "rsCanvas"  );
rsCanvas->setDoubleBuffering ( true );
rsCanvas->setBackgroundColor( cnfMsbColor );
rsCanvas->resize( 712, 30 );
QCanvasView *rsCanvasView = new QCanvasView( rsCanvas, frame3, "rsCanvasView" );
rsCanvasView->setFixedSize( 712, 30 );
rsCanvasView->setHScrollBarMode( QScrollView::AlwaysOff );
rsCanvasView->setVScrollBarMode( QScrollView::AlwaysOff );
rsCanvasView->setFrameShadow( QFrame::Plain );

rsPos1 = frame3->width();
QFont serifFont( "Times", 20 );

rsText1 = new QCanvasText( cnfMsText , rsCanvas );
rsText1->setFont( serifFont );
rsText1->setColor( cnfMsfColor );
rsText1->move( rsPos1, 0 );
rsText1->show();

rsPos2 = rsPos1 + rsText1->boundingRect().width() + 712 / 2 + 10;

rsText2 = new QCanvasText( cnfMsText, rsCanvas );
rsText2->setFont( serifFont );
rsText2->setColor( cnfMsfColor );
rsText2->move( rsPos2, 0 );
rsText2->show();

rsCanvasView->show();

QTimer *rsTimer = new QTimer( this );
connect( rsTimer, SIGNAL( timeout() ), this, SLOT( rsMoveSlot() ));
rsTimer->start( cnfMsSpeed * 3, FALSE );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Moves running string.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::rsMoveSlot()
{

rsText1->move( rsPos1, 0 );
rsText2->move( rsPos2, 0 );
rsCanvas->update();

if ( rsPos1 < -rsText1->boundingRect().width() ) 
	rsPos1  = rsPos2 + rsText2->boundingRect().width() + 712 / 2 + 10;
else rsPos1 --;

if ( rsPos2 < -rsText2->boundingRect().width() ) 
	rsPos2  = rsPos1 + rsText1->boundingRect().width() + 712 / 2 + 10;
else rsPos2 --;

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Controls volume.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::setVolume( int leftV, int rightV )
{

procVolume = new QProcess( this );
procVolume->addArgument( "/usr/bin/amixer" );
procVolume->addArgument( "set" );
procVolume->addArgument( "Master" );
procVolume->addArgument( QString( "%1%,%2%" ).arg( leftV ).arg( rightV ) );

if ( ! procVolume->start() ) 	jbError( "Couldn't change volume !", "error");

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Save volume into file.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::saveVolume()
{

QProcess * procAlsaStore = new QProcess( this );
procAlsaStore->addArgument( "/usr/sbin/alsactl" );
procAlsaStore->addArgument( "store" );

if ( ! procAlsaStore->start() ) jbError( "Couldn't save volume !", "error");

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Reads current volume.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::restoreVolume()
{

QProcess * procAlsaRestore = new QProcess( this );
procAlsaRestore->addArgument( "/usr/sbin/alsactl" );
procAlsaRestore->addArgument( "restore" );

if ( ! procAlsaRestore->start() ) jbError( "Couldn't restore volume !", "error");

procVolume = new QProcess( this );
procVolume->addArgument( "/usr/bin/amixer" );
procVolume->addArgument( "get" );
procVolume->addArgument( "Master" );

connect( procVolume, SIGNAL( readyReadStdout() ), this, SLOT( getVolumeSlot() ) );

if ( ! procVolume->start() ) jbError( "Couldn't read volume !", "error");


}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Sycronyze music archive.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::syncSlot()
{

backUp( 'a' );
isHalted = true;
stopSlot();
if ( autoHaltTimer->isActive() ) autoHaltTimer->stop();
if ( back2BaseTimer->isActive() ) back2BaseTimer->stop();
if ( backMusicTimer->isActive() ) backMusicTimer->stop();
bMStopSlot();
saveVolume();

procSync = new QProcess( this );
procSync->addArgument( "sh" );
procSync->addArgument( programDir + "/sync.sh" );

connect( procSync, SIGNAL( processExited() ), this, SLOT( syncExitSlot() ) );
connect( procSync, SIGNAL( readyReadStdout () ), this, SLOT( syncStdoutSlot() ) );

syncOutput = new SyncOutput( this, "Syncronizing...", false );
syncOutput->show();

if ( ! procSync->start() ) jbError( "Couldn't start syncronization script.", "error" );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Analize exit status of  sync.sh script.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::syncExitSlot()
{

bool poweroff = false;
int syncES = procSync->exitStatus();
QString syncESS;

switch ( syncES )
{
	case 11 : syncESS = "ERROR:   'mount' not found.";
					poweroff = false;
					break;
	case 12 : syncESS = "ERROR:   'umount' not found.";
					poweroff = false;
					break;
	case 13 : syncESS = "ERROR:   'rsync' not found.";
					poweroff = false;
					break;
	case 14 : syncESS = "ERROR:   'comm' not found.";
					poweroff = false;
					break;
	case 21 : syncESS = "ERROR:   'rsync' returned error.";
					poweroff = false;
					break;
	case 22 : syncESS = "ERROR:   couldn't mount.";
					poweroff = false;
					break;
	case 24 : syncESS = "ERROR:   unknown box.";
					poweroff = false;
					break;
	case 25 : syncESS = "ERROR:   couldn't find JukeBox home directory.";
					poweroff = false;
					break;
	case 0 : syncESS = "Syncronization was made correctly.";
					poweroff = true;
					break;
	default   : syncESS = "ERROR:   UNKNOWN ERROR.";
					poweroff = false;
}

syncOutput->addText( syncESS );

if ( poweroff == true ) 
{
	syncOutput->addText( "Stoping the box. Bye...." );
	QTimer::singleShot( 5000, this, SLOT( haltSlot() ) );
}
else QTimer::singleShot( 5000, syncOutput, SLOT( close() ) );

}



/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Analize exit status of  sync.sh script.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::syncStdoutSlot()
{

syncOutput->addText( procSync->readLineStdout() );

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Load reklama video files into 'reklamaList'.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::reklamaLoad()
{

frameId = frame2->winId();

QDir reklamaDir( cnfReklamaDir );
if ( reklamaDir.exists() )
{
	reklamaList.clear(); 
	reklamaList = reklamaDir.entryList( "*.[aA][vV][iI]; *.[jJ][pP][gG]" );
	rLIterator = reklamaList.begin();
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Starts playing reklama.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::reklamaSlot()
{

if ( reklamaList.empty() ) return;

QString rekFile =  *rLIterator;

if ( ! reklamaList.empty() )
{
	if ( "avi" == rekFile.section( '.',-1 ).lower() )
	{
		frame2->unsetPalette();
		frame2->setPaletteBackgroundColor( QColor( 0, 0, 0) );
		playReklama( rekFile );
	}
	else if ( ( "jpeg" == rekFile.section( '.',-1 ).lower() ) || ( "jpg" == rekFile.section( '.',-1 ).lower() ) ) 
	{
		QImage *image = new QImage( cnfReklamaDir + "/" + rekFile );
		frame2->setPaletteBackgroundPixmap( image->scale( 712, 556, QImage::ScaleFree ) );
		QTimer::singleShot( cnfReklamaTime * 1000, this, SLOT( reklamaSlot() ) );
	}

	if ( ++rLIterator == reklamaList.end() ) rLIterator = reklamaList.begin();
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
FUNCTION
Plays reklama videos.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void jukebox::playReklama( QString fileName )
{

QString ID, FW, FH;

procReklama = new QProcess( this );
procReklama->addArgument( "/usr/local/bin/mplayer" );
procReklama->addArgument( "-zoom" );
procReklama->addArgument( "-noautosub" );
procReklama->addArgument( "-wid" );
procReklama->addArgument( ID.setNum( frameId ) );
procReklama->addArgument( "-osdlevel" );
procReklama->addArgument( "0" );
procReklama->addArgument( "-x" );
procReklama->addArgument( FW.setNum( 712 ) );
procReklama->addArgument( "-y" );
procReklama->addArgument( FH.setNum( 556 ) );
procReklama->addArgument( "-nosound" );
procReklama->addArgument( "-cache" );
procReklama->addArgument( "1024" );
procReklama->addArgument( "-double" );
procReklama->addArgument( "-slave" );
procReklama->addArgument( "--" );
procReklama->addArgument( cnfReklamaDir+"/"+ fileName );
  
connect( procReklama, SIGNAL( processExited() ), this, SLOT( reklamaSlot() ) );
  
if ( ! procReklama->start() ) jbError( "Couldn't start video playing!!!", "error" );

playList->setFocus();
frame2->clearFocus();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Stops reklama video.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::reklamaStopSlot()
{
  
if ( procReklama->isRunning() )
{
	procReklama->tryTerminate();
	QTimer::singleShot( 1000, procReklama, SLOT( kill() ) );
}
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Halts jukebox aparat after cnfHaltTime.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::autoHaltSlot()
{

if ( "00:00:00" == cnfHaltTime.toString() ) autoHaltTimer->stop();
else if ( cnfHaltTime <= QTime::currentTime() ) haltSlot();

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Listen the special keyboard and executes apropriate slots.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::keyPadSlot()
{

unsigned short num = 0;

if ( num == keyPadLastNum )
{
	if ( keyPSFirst == true )
	{
		if ( keyPadSleep <= 50 )
		{
			keyPadSleep++;
			return;
		}
		keyPSFirst = false;
	}
	else
	{
		if ( keyPadSleep <= 2 )
		{
			keyPadSleep++;
			return;
		}
	}
}
else
{
	keyPadLastNum = num;
	keyPSFirst = true;
}

if ( ! isMenu )
{
	if ( 15 == num ) menuSlot();
	else
	{
    	switch( num )
	    {
	    case 30 : back2BaseSlot();
	      break;
	    case 27 : upSlot();
	      break;
	    case 23 : downSlot();
	      break;
	    case 29 : playChooseSlot();
	    }
		keyPadSleep = 0;
	}
}
else
{
	if ( 15 == num ) menuSlot();
	else
	{
    	switch( num )
	    {
	    case 30 : syncSlot();
	      break;
	    case 28 : resetCounterSlot();
	      break;
	    case 27 : volUpSlot();
	      break;
	    case 23 :  volDownSlot();
	      break;
	    case 25 : leftBalanceSlot();
	      break;
	    case 21 : rightBalanceSlot();
	    }
		keyPadSleep = 0;
	}
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Listen the special keyboard and executes apropriate slots.
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::menuSlot()
{

if ( isMenu )
{
	isMenu = false;
	setCounters('H');
	setCounters('h');
}
else
{
	isMenu = true;
	setCounters('C');
	setCounters('A');
}

}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++
SLOT
Read after alsa restore volume .
++++++++++++++++++++++++++++++++++++++++++++++++++++++*/ 
void jukebox::getVolumeSlot()
{

if ( procVolume->canReadLineStdout() )
{
	procVolume->readLineStdout();
	procVolume->readLineStdout();
	procVolume->readLineStdout();
	procVolume->readLineStdout();

	volumeLeft = procVolume->readLineStdout().section( '[', 1, 1 ).section( '%', 0, 0 ).toInt();
	volumeRight = procVolume->readLineStdout().section( '[', 1, 1 ).section( '%', 0, 0 ).toInt();
}
else 
{
	volumeLeft = 50;
	volumeRight = 50;
	jbError( "Couldn't restore volume !", "error");
}

}

