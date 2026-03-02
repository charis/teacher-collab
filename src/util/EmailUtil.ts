"use server" // This is required as the nodemailer works only in the backend
             // environment
// Library imports
// After 'npm install nodemailer' give 'npm i --save-dev @types/nodemailer'
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
// Custom imports
import { addForgotPasswordToken, addVerificationToken } from "@/util/ServerActions"
import { HOST_URL, TOKEN_EXPIRY_IN_HOURS} from "@/constants";
import { EmailType } from "@/types"
import { generateRandomString } from "@/util/CryptoUtil";

/**
 * Sends an email.
 * 
 * @param email - The user email address
 * @param type - The email type
 * 
 * @return the mail response once the email has been sent
 */
export async function sendEmail(email:string, type:EmailType):Promise<SMTPTransport.SentMessageInfo>
{
    // Create a 64-byte token and the expiry
    const token = generateRandomString(64);
    const expiry: Date = new Date(Date.now() + TOKEN_EXPIRY_IN_HOURS * 3600000);

    // Update the DB
    let subject  = '';
    let bodyHtml = '';
    let errorMessage: string | null = null;
    switch (type) {
        case EmailType.ACCOUNT_VERIFICATION:
             subject  = 'Account verification';
             bodyHtml = `<p>
                             Click <a href="${HOST_URL}/verify-user/${token}">here</a> to verify
                             your email or copy and paste the link below in your browser.<br>
                             ${HOST_URL}/verify-user/${token}
                        </p>`;
             errorMessage = await addVerificationToken(email, token, expiry);
             break;
        
        case EmailType.RESET_PASSWORD:
             subject  = 'Password reset';
             bodyHtml = `<p>
                            Click <a href="${HOST_URL}/reset-password/${token}">here</a> to reset
                            your password or copy and paste the link below in your browser.<br>
                            ${HOST_URL}/reset-password/${token}
                        </p>`;
             errorMessage = await addForgotPasswordToken(email, token, expiry);
             break;
    }
    
    if (errorMessage) {
        throw new Error(errorMessage);
    }
    
    try {
        // Email sender configuration
        const transport = nodemailer.createTransport({ service: 'gmail',
                                                       auth: {
                                                           user: 'teachercollab.ai@gmail.com',
                                                           pass: process.env.GMAIL_APP_PASSWORD 
                                                       }
                                                    });
        
        // Email data
        const mailOptions = { from   : 'teachercollab.ai@gmail.com',
                              to     : email,
                              subject: subject,
                              html   : bodyHtml };
        
        // Send out the email
        const response = await transport.sendMail(mailOptions);
        
        return response;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('An unknown error occurred');
    }
}
