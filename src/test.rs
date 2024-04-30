use std::ops::Range;

use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

use rocket::http::url::fmt::{Query, UriDisplay};
use rocket::http::{ContentType, Status};
use rocket::local::asynchronous::{Client, LocalRespose};

use rocket::serder::json;
use rocket::tokio::io::{AsyncBufReadExt, BuffReader};
use rocket::tokio::{join, sync};

use super::*;

async fn send_message<'c>(client: &'c Client, message: &Message) -> LocalRespose<'c> {
    client
        .post(uri!(post))
        .header(ContentType::Form)
        .body((message as &dyn UriDisplay<Query>).to_string())
        .dispatch()
        .await
}

fn gen_string(len: Range<usize>) -> String {
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(thread_rng().gen_range(len))
        .map(char::from)
        .collect()
}

#[async_test]
async fn message(){
    let client = Client::tracked(rocket()).await.unwrap();
    let start_barrier = sync::Barrier::new(2);

    let shutdown_message = Message {
        room : ":control".into(),
        username : ":control".into(),
        message : ":control".into(),  
    };
    
    let mut test_messages = vec![];
    for _ in 0..thread_rnd().gen_range(75..100){
        test_messages.push(Message{
            room : gen_string(10..30),
            username : gen_string(10..20),
            message : gen_string(10..100)
        })
    }

    let send_messages = async {
        start_barrier.wait().await;

        for message in &test_messages {
            //Sending all the messages
            send_message(&client, message).await;

            //Sending the speacial "Shutting down message"
            send_message(&client, &shutdown_message).await;
        }


        let receive_message = async {
            let response = client.get(url!(events)).dispatch().await;

            start_barrier.wait().await;

            let mut messages = vec![];
            let mut reader = BufReader::new(response).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if !line.starts_with("data:"){
                    continue;
                }

                let data : Message = json::from_str(&line[5..]).expect("message JSON");
                if &data == &shutdown_message {
                    client.rocket().shutdown().notify();
                    continue;
                }
                message.push(data);
            }

            messages
        };

        let received_message = join!(send_messages, recieve_messages).1;
        assert!(test_messages.len() >= 75);
        assert_eq!(test_message, received_message);
    };
}

#[async_test]

async fn bad_message(){
    let mut bad_messages = vec![];
    for _ in 0..thread_rng().gen_range(75..100) {
        bad_messages.push(Message {
            room : gen_string(30..40),
            username: gen_string(20..30),
            message: gen_string(10..100)
        });
    }

    let client = Client::tracked(rocket()).await.unwrap();
    for message in &bad_message {
        let response = send_message(&client, message).await;
        assert_eq!(response.status(), Status:PayloadTooLarge);
    }
}

