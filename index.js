const Discord = require('discord.js');
require('dotenv').config();

const client = new Discord.Client();
const Profile = require('./models/Profile');
const {connect} = require('mongoose');
const prefix = "!";
let interests = [];
let freeTime = [];

const meetingLinks = {
  happyhour: ["https://kahoot.it/","https://icebreaker.video/"],
  brainstorming: ["https://miro.com/", "https://figma.com"],
  study: ["https://quizlet.com", "https://docs.google.com/", "https://evernote.com/"]
}

const commands = ["resources", "commands", "profile"];

const createUser = (userName, interests, freeTime)  => {
  return {userName: userName, interests: [...interests], freeTime: [...freeTime]};
}

const profileTemplate = (user) => {
  
  // Embeds for formatted message. Source: https://discordjs.guide/popular-topics/embeds.html
  let embeddedMsg = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle(user.userName + "'s Profile")
    .addFields(
      { name: 'Interests', value: user.interests, inline: true },
      { name: 'Free time', value: user.freeTime, inline: true },
    )
    .setTimestamp()

    return embeddedMsg;
  }

client.on("message", async message => {
  if(message.author.bot) return;
  if(!message.content.startsWith(prefix)) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();

  if(command === "resources"){
    const meetingType = args[0];
    const links = meetingLinks[meetingType];
    const listOfLinksMsg = new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setTitle(`Resources for your ${meetingType} meeting`)
      .addField('Resources', links, true)
      .setTimeStamp();
    message.channel.send(listOfLinksMsg);

    // Check if a channel for meetingType exists, if not create it.
    if(message.guild.channels.cache.find(channel => channel.name === meetingType)){
      message.channel.send(`Check out the ${meetingType} channel!`);
    } else {
      message.guild.channels.create(meetingType, {
        type: 'text'
      });
      return;
    }
  } else if(command === "commands"){  
      // Embeds for formatted message. Source: https://discordjs.guide/popular-topics/embeds.html
      let embeddedMsg = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Collabo Commands")
        .addFields(
          { name: 'Commands', value: commands, inline: true },
          { name: 'Example', value: ['!resources brainstorming', '!commands', '!profile set/get [USERNAME] (only include username if using get command)'], inline: true },
        )
        .setTimestamp();

      return message.channel.send(embeddedMsg);
  } else if(command === "profile"){
      if(args[0] === "set"){

        const req = await Profile.findOne({userName: message.author.username});

        if(req){
          return message.channel.send("You already have a profile");
        }

        // Check if message is being sent to author
        let filter = m => m.author.id === message.author.id;

        // Message is sent to user
        // Source: https://stackoverflow.com/questions/45856446/discord-js-reply-to-message-then-wait-for-reply
        await message.author.send("What are a few of your interests? Please enter 3.");

        await message.author.dmChannel.awaitMessages(filter, {
            max: 3,
            time: 300000,
            errors: ['time']
          })
          .then(messages => {
            let responses = messages.array();
            for(let i = 0; i < responses.length; i++){
              interests.push(responses[i].content);
            }
            message.author.send("Thanks for the reply!");
            //console.log(interests);
          })
          .catch(collected => {
              //console.log(message);
              message.author.send('Timed out waiting for response.' + collected);
          });
        

      await message.author.send("What do you like to do in your free time? Please enter 3.");

      await message.author.dmChannel.awaitMessages(filter, {
          max: 3,
          time: 300000,
          errors: ['time']
        })
        .then(messages => {
          let responses = messages.array();
          for(let i = 0; i < responses.length; i++){
            freeTime.push(responses[i].content);
          }
          message.author.send("Thanks for the reply!");
          console.log(freeTime);
        })
        .catch(collected => {
            console.log(message);
            message.author.send('Timed out waiting for response.' + collected);
        });

        const profile = new Profile({
          id: message.author.id,
          userName: message.author.username,
          interests: interests,
          freeTime: freeTime
        });

        await profile.save();

        let user = createUser(message.author.username, interests, freeTime);
        users.push(user);
        //console.log(users);
      } else if(args[0] === "get"){

        let userName = '';
        // Some usernames may have spaces therefore since this is an argument array
        // the spaces are not taking into account. To counter this, when a space is reached
        // after the first argument following the 'get' command, a space is added to the userName string.
        for(let i = 1; i < args.length; i++){
          userName += args[i];
          if(i != args.length - 1){
            userName += " ";
          }
        }

        const req = await Profile.findOne({userName: userName});
        //console.log(req.userName);
        if(!req){
          return message.channel.send(userName + "'s profile doesn't exist");
        } else {
          let user = createUser(req.userName, req.interests, req.freeTime);
          message.channel.send(profileTemplate(user))
        }
        

        // Iterate through users and find the user that is being requested
        // users.forEach(user => {
        //   if(user.userName === userName){
        //     found = true;
        //     message.channel.send(profileTemplate(user));
        //   }
        // })

        // if(!found){
        //   message.channel.send(userName + " doesn't have a profile.");
        // }
    }
  }
});

(async () => {
  await connect(process.env.MONGO_KEY,{
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  return client.login(process.env.BOT_TOKEN);
})();